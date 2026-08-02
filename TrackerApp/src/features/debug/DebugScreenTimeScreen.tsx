import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Clipboard,
} from 'react-native';
import { NativeModules } from 'react-native';
import { formatScreenTime } from '../../stores/screenTimeStore';

const { UsageStatsModule } = NativeModules;

interface DebugSession {
  start: number;
  end: number;
}

interface DebugAppUsage {
  packageName: string;
  appName: string;
  totalTimeMs: number;
  sessions: DebugSession[];
}

interface DebugStats {
  totalScreenTimeMs: number;
  unlockCount: number;
  apps: DebugAppUsage[];
}

type TimeRange = '1hour' | '24hours' | 'custom' | 'test';

export default function DebugScreenTimeScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1hour');
  const [stats, setStats] = useState<DebugStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [debugLogging, setDebugLogging] = useState(false);

  // Calculate time range
  const getTimeRange = (): { start: number; end: number } => {
    const now = Date.now();
    switch (timeRange) {
      case '1hour':
        return { start: now - 60 * 60 * 1000, end: now };
      case '24hours':
        return { start: now - 24 * 60 * 60 * 1000, end: now };
      case 'test':
        if (!testStartTime) return { start: now, end: now };
        return { start: testStartTime, end: now };
      default:
        return { start: now - 60 * 60 * 1000, end: now };
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    setLoading(true);
    try {
      const { start, end } = getTimeRange();
      
      // Enable debug logging if flag is set
      if (debugLogging && UsageStatsModule.setDebugLogging) {
        await UsageStatsModule.setDebugLogging(true);
      }

      const result = await UsageStatsModule.fetchStatsForRange(start, end);
      setStats(result);
      
      // Disable debug logging after fetch
      if (debugLogging && UsageStatsModule.setDebugLogging) {
        await UsageStatsModule.setDebugLogging(false);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to fetch stats: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Start live test
  const startLiveTest = () => {
    const now = Date.now();
    setTestStartTime(now);
    setTimeRange('test');
    setStats(null);
    Alert.alert(
      'Live Test Started',
      `Test window started at ${new Date(now).toLocaleTimeString()}.\n\nNow:\n1. Use your phone normally\n2. Open different apps\n3. Lock/unlock screen\n4. Switch between apps\n\nPress "Finish Test" when done.`,
      [{ text: 'OK' }]
    );
  };

  // Finish live test
  const finishLiveTest = async () => {
    if (!testStartTime) {
      Alert.alert('Error', 'No test started');
      return;
    }
    
    Alert.alert(
      'Test Finished',
      `Test window: ${new Date(testStartTime).toLocaleTimeString()} - ${new Date().toLocaleTimeString()}\n\nFetching results...`,
      [{ text: 'OK' }]
    );
    
    await fetchStats();
  };

  // Copy to clipboard
  const copyAsJSON = () => {
    if (!stats) return;
    const json = JSON.stringify(stats, null, 2);
    Clipboard.setString(json);
    Alert.alert('Copied', 'Stats copied to clipboard as JSON');
  };

  // Format timestamp
  const formatTimestamp = (ms: number) => {
    return new Date(ms).toLocaleTimeString();
  };

  // Render discrepancy checklist
  const renderChecklist = () => {
    if (!stats) return null;

    const { start, end } = getTimeRange();
    const duration = Math.round((end - start) / 1000 / 60);

    return (
      <View style={styles.checklist}>
        <Text style={styles.checklistTitle}>📋 Manual Validation Checklist</Text>
        <Text style={styles.checklistText}>
          Time window: {new Date(start).toLocaleTimeString()} - {new Date(end).toLocaleTimeString()} ({duration} min)
        </Text>
        <Text style={styles.checklistText}>
          Total screen time: {formatScreenTime(stats.totalScreenTimeMs)}
        </Text>
        <Text style={styles.checklistText}>
          Apps tracked: {stats.apps.length}
        </Text>
        <Text style={styles.checklistText}>
          Unlocks: {stats.unlockCount}
        </Text>
        <Text style={styles.checklistHeader}>Now check Digital Wellbeing:</Text>
        <Text style={styles.checklistItem}>
          ☐ Total time matches (within ±10 seconds)
        </Text>
        <Text style={styles.checklistItem}>
          ☐ Session count seems plausible
        </Text>
        <Text style={styles.checklistItem}>
          ☐ No apps I used are missing
        </Text>
        <Text style={styles.checklistItem}>
          ☐ Top apps match my actual usage
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔍 Screen Time Debug</Text>
      
      {/* Time Range Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Time Range</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.rangeButton, timeRange === '1hour' && styles.rangeButtonActive]}
            onPress={() => setTimeRange('1hour')}
          >
            <Text style={styles.rangeButtonText}>Last Hour</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rangeButton, timeRange === '24hours' && styles.rangeButtonActive]}
            onPress={() => setTimeRange('24hours')}
          >
            <Text style={styles.rangeButtonText}>Last 24h</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Debug Logging Toggle */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setDebugLogging(!debugLogging)}
        >
          <View style={[styles.checkbox, debugLogging && styles.checkboxChecked]}>
            {debugLogging && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Enable Logcat debug logging</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          When enabled, raw events and session merging will be logged to Logcat
        </Text>
      </View>

      {/* Live Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live Test Mode</Text>
        {!testStartTime ? (
          <TouchableOpacity style={styles.testButton} onPress={startLiveTest}>
            <Text style={styles.testButtonText}>▶ Start Live Test</Text>
          </TouchableOpacity>
        ) : (
          <View>
            <Text style={styles.testInfo}>
              Test running since {new Date(testStartTime).toLocaleTimeString()}
            </Text>
            <TouchableOpacity style={styles.testButton} onPress={finishLiveTest}>
              <Text style={styles.testButtonText}>⏹ Finish Test & Show Results</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Fetch Button */}
      <TouchableOpacity
        style={[styles.fetchButton, loading && styles.fetchButtonDisabled]}
        onPress={fetchStats}
        disabled={loading}
      >
        <Text style={styles.fetchButtonText}>
          {loading ? 'Loading...' : 'Fetch Stats'}
        </Text>
      </TouchableOpacity>

      {/* Results */}
      {stats && (
        <>
          {/* Summary */}
          <View style={styles.section}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Screen Time:</Text>
              <Text style={styles.summaryValue}>
                {formatScreenTime(stats.totalScreenTimeMs)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Unlocks:</Text>
              <Text style={styles.summaryValue}>{stats.unlockCount}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Apps:</Text>
              <Text style={styles.summaryValue}>{stats.apps.length}</Text>
            </View>
          </View>

          {/* Copy Button */}
          <TouchableOpacity style={styles.copyButton} onPress={copyAsJSON}>
            <Text style={styles.copyButtonText}>📋 Copy as JSON</Text>
          </TouchableOpacity>

          {/* Apps Table */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Apps Breakdown</Text>
            {stats.apps.map((app, index) => (
              <View key={index} style={styles.appCard}>
                <Text style={styles.appName}>{app.appName}</Text>
                <Text style={styles.appPackage}>{app.packageName}</Text>
                <View style={styles.appStats}>
                  <Text style={styles.appTime}>
                    {formatScreenTime(app.totalTimeMs)}
                  </Text>
                  <Text style={styles.appSessions}>
                    {app.sessions.length} session{app.sessions.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                
                {/* Sessions */}
                <View style={styles.sessionsList}>
                  <Text style={styles.sessionsTitle}>Sessions:</Text>
                  {app.sessions.map((session, idx) => (
                    <View key={idx} style={styles.sessionRow}>
                      <Text style={styles.sessionText}>
                        {formatTimestamp(session.start)} → {formatTimestamp(session.end)}
                      </Text>
                      <Text style={styles.sessionDuration}>
                        ({Math.round((session.end - session.start) / 1000)}s)
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Checklist */}
          {renderChecklist()}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rangeButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
  },
  rangeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#003366',
  },
  rangeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 16,
  },
  hint: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  testButton: {
    padding: 16,
    backgroundColor: '#28a745',
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  testInfo: {
    color: '#28a745',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  fetchButton: {
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  fetchButtonDisabled: {
    backgroundColor: '#555',
  },
  fetchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  summaryLabel: {
    color: '#999',
    fontSize: 14,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  copyButton: {
    padding: 12,
    backgroundColor: '#555',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  appCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  appName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  appPackage: {
    color: '#666',
    fontSize: 12,
    marginBottom: 12,
  },
  appStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  appTime: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  appSessions: {
    color: '#999',
    fontSize: 14,
  },
  sessionsList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  sessionsTitle: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sessionText: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  sessionDuration: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  checklist: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 32,
  },
  checklistTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  checklistText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  checklistHeader: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  checklistItem: {
    color: '#999',
    fontSize: 14,
    marginBottom: 6,
    fontFamily: 'monospace',
  },
});
