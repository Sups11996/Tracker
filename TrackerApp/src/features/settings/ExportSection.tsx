/**
 * Data Export Section for Settings Screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Download, FileText, Calendar, Upload } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { exportData, ExportPresets, createFullBackup, type ExportFormat } from '../../lib/exportUtils';
import { pickBackupFile, importFullBackup, getBackupInfo, type ImportMode } from '../../lib/importUtils';
import { getTodayLocal, getDaysAgoLocal } from '../../lib/dateUtils';
import { useUserStore } from '../../stores/userStore';
import { hydrateWaterStore } from '../../stores/waterStore';
import { hydrateStepStore } from '../../stores/stepStore';
import { hydrateSleepStore } from '../../stores/sleepStore';
import { hydrateCaloriesStore } from '../../stores/caloriesStore';
import { hydrateAbcStore } from '../../stores/abcStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

export function ExportSection() {
  const db = useSQLiteContext();
  const { showSuccess, showError, showAlert, showConfirm } = useCustomAlert();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const profile = useUserStore(state => state.profile);
  const username = profile?.username || 'user';

  async function handleAllTimeExport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const userPrefix = username ? `${username}_` : '';
    const fileName = `${userPrefix}tracker_${timestamp}.json`;
    
    // Show confirmation dialog first
    showConfirm(
      'Export All Data',
      `Export file: ${fileName}\n\nYou'll be asked to select where to save it.`,
      async () => {
        setExporting(true);
        try {
          const today = getTodayLocal();
          
          // Get earliest date from database
          const earliest = await db.getFirstAsync<{ earliest: string }>(
            `SELECT MIN(date) as earliest FROM (
              SELECT date FROM daily_steps
              UNION SELECT date FROM sleep_sessions
              UNION SELECT date FROM water_daily_summary
              UNION SELECT date FROM calories_daily_summary
              UNION SELECT date FROM abc_daily_summary
            )`
          );
          const startDate = earliest?.earliest || today;
          const options = ExportPresets.allTime(startDate, today);
          options.format = 'json';

          await exportData(db, options, username);
          
          setTimeout(() => {
            showSuccess('Export Complete', `File saved successfully:\n${fileName}`);
          }, 100);
        } catch (error) {
          console.error('[ExportSection] Export failed:', error);
          // Don't show error if user cancelled
          if (error instanceof Error && !error.message.includes('cancelled')) {
            setTimeout(() => {
              showError('Export Failed', 'Could not save file. Please try again.');
            }, 100);
          }
        } finally {
          setExporting(false);
        }
      },
      'Export'
    );
  }

  async function handleImport() {
    try {
      setImporting(true);
      
      // Pick file
      const fileUri = await pickBackupFile();
      if (!fileUri) {
        setImporting(false);
        return; // User cancelled
      }

      // Get backup info
      const info = await getBackupInfo(fileUri);
      if (!info.isValid) {
        setImporting(false);
        setTimeout(() => {
          showError('Invalid File', 'This is not a valid backup file.');
        }, 100);
        return;
      }

      // Show import options
      setImporting(false);
      showAlert({
        title: 'Import Data',
        message: `Found:\n• ${info.itemCounts?.steps || 0} days of steps\n• ${info.itemCounts?.sleep || 0} sleep sessions\n• ${info.itemCounts?.water || 0} water logs\n• ${info.itemCounts?.calories || 0} workout logs\n• ${info.itemCounts?.abc || 0} ABC entries\n\nHow do you want to import?`,
        type: 'info',
        actions: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Merge (Keep Both)',
            style: 'default',
            onPress: () => performImport(fileUri, 'merge'),
          },
          {
            text: 'Replace (Delete Old)',
            style: 'destructive',
            onPress: () => performImport(fileUri, 'replace'),
          },
        ],
      });
    } catch (error) {
      setImporting(false);
      console.error('[ExportSection] Import picker failed:', error);
      setTimeout(() => {
        showError('Import Failed', 'Could not open file picker.');
      }, 100);
    }
  }

  async function performImport(fileUri: string, mode: ImportMode) {
    setImporting(true);
    try {
      const result = await importFullBackup(db, fileUri, mode);
      
      if (result.success) {
        // Rehydrate all stores so UI reflects imported data immediately
        // hydrateStepStore must complete before hydrateCaloriesStore
        // so walking calories are read correctly from DB (not step store)
        await hydrateStepStore(db);
        await Promise.all([
          hydrateSleepStore(db),
          hydrateWaterStore(db),
          hydrateCaloriesStore(db),
          hydrateAbcStore(db),
        ]);

        setTimeout(() => {
          showSuccess(
            'Import Complete',
            `Imported ${result.itemsImported?.steps || 0} steps, ${result.itemsImported?.sleep || 0} sleep, ${result.itemsImported?.water || 0} water, ${result.itemsImported?.calories || 0} calories, ${result.itemsImported?.abc || 0} ABC records.`
          );
        }, 100);
      } else {
        setTimeout(() => {
          showError('Import Failed', result.message);
        }, 100);
      }
    } catch (error) {
      console.error('[ExportSection] Import failed:', error);
      setTimeout(() => {
        showError('Import Failed', 'Could not import backup. Please try again.');
      }, 100);
    } finally {
      setImporting(false);
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Backup & Restore</Text>
      </View>

      <Card style={styles.card}>
        {/* Export Section */}
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Export Data</Text>
          <Text style={styles.description}>
            Save your tracking data to a file.
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, exporting && styles.actionButtonDisabled]}
            onPress={handleAllTimeExport}
            disabled={exporting}
          >
            <View style={styles.actionIcon}>
              <Download size={20} color={COLORS.steps} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionLabel}>Export All Data</Text>
              <Text style={styles.actionDesc}>Save complete history as JSON</Text>
            </View>
            {exporting && <ActivityIndicator size="small" color={COLORS.steps} />}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Import Section */}
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Import Data</Text>
          <Text style={styles.description}>
            Restore data from a backup file.
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.importActionButton, importing && styles.actionButtonDisabled]}
            onPress={handleImport}
            disabled={importing}
          >
            <View style={[styles.actionIcon, styles.importActionIcon]}>
              <Upload size={20} color={COLORS.water} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionLabel}>Import Data</Text>
              <Text style={styles.actionDesc}>Restore from JSON file</Text>
            </View>
            {importing && <ActivityIndicator size="small" color={COLORS.water} />}
          </TouchableOpacity>

          {/* Import Options */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Import Options</Text>
            <View style={styles.optionItem}>
              <View style={styles.optionBullet} />
              <Text style={styles.optionText}>
                <Text style={styles.optionBold}>Merge:</Text> Merge with existing data. Duplicates will be overwritten with imported data.
              </Text>
            </View>
            <View style={styles.optionItem}>
              <View style={[styles.optionBullet, styles.optionBulletWarning]} />
              <Text style={styles.optionText}>
                <Text style={styles.optionBold}>Replace:</Text> Overwrite all existing data with imported data.
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  card: {
    gap: SPACING.xl,
  },
  subsection: {
    gap: SPACING.md,
  },
  subsectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  description: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.size.sm * 1.4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.glassBorder,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.steps + '40',
    gap: SPACING.md,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  importActionButton: {
    borderColor: COLORS.water + '40',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.steps + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importActionIcon: {
    backgroundColor: COLORS.water + '20',
  },
  actionContent: {
    flex: 1,
    gap: SPACING.xs,
  },
  actionLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  actionDesc: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
  },
  infoBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  infoTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  optionItem: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  optionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.steps,
    marginTop: 6,
  },
  optionBulletWarning: {
    backgroundColor: COLORS.error,
  },
  optionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.size.sm * 1.5,
  },
  optionBold: {
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  // Keep legacy styles for compatibility
  exportButton: {},
  exportButtonDisabled: {},
  backupButton: {},
  backupIcon: {},
  importButton: {},
  importIcon: {},
  exportIcon: {},
  exportInfo: {},
  exportLabel: {},
  exportDesc: {},
  buttonGroup: {},
  subtitle: {},
  note: {},
  importOptions: {},
  importOptionTitle: {},
  importOption: {},
});
