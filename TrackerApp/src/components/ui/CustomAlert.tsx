import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react-native';
import { COLORS, GLASS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface AlertAction {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  actions?: AlertAction[];
  onDismiss?: () => void;
}

export function CustomAlert({
  visible,
  title,
  message,
  type = 'info',
  actions = [{ text: 'OK' }],
  onDismiss,
}: CustomAlertProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={24} color={COLORS.success} />;
      case 'warning':
      case 'error':
        return <AlertTriangle size={24} color={type === 'error' ? COLORS.error : COLORS.warning} />;
      default:
        return null;
    }
  };

  const handleActionPress = (action: AlertAction) => {
    action.onPress?.();
    onDismiss?.();
  };

  const handleBackdropPress = () => {
    // Only dismiss on backdrop if there's a cancel action
    const hasCancelAction = actions.some(action => action.style === 'cancel');
    if (hasCancelAction) {
      onDismiss?.();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={handleBackdropPress}>
        <BlurView intensity={90} tint="dark" style={styles.backdrop}>
          <View style={styles.container}>
            <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
              <BlurView intensity={GLASS.blurModal} style={styles.modalBlur}>
                <View style={styles.content}>
                  {/* Header with icon and title */}
                  <View style={styles.header}>
                    {getIcon()}
                    <View style={styles.headerText}>
                      <Text style={styles.title}>{title}</Text>
                      {message && <Text style={styles.message}>{message}</Text>}
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.actions}>
                    {actions.map((action, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.actionButton,
                          action.style === 'destructive' && styles.destructiveButton,
                          action.style === 'cancel' && styles.cancelButton,
                        ]}
                        onPress={() => handleActionPress(action)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.actionText,
                            action.style === 'destructive' && styles.destructiveText,
                            action.style === 'cancel' && styles.cancelText,
                          ]}
                        >
                          {action.text}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </BlurView>
            </Pressable>
          </View>
        </BlurView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.70)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  modal: {
    width: '100%',
    maxWidth: 340,
  },
  modalBlur: {
    borderRadius: GLASS.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS.border,
    ...GLASS.shadow,
  },
  content: {
    backgroundColor: GLASS.modalBg,
    padding: SPACING.xxl,
    gap: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  headerText: {
    flex: 1,
    gap: SPACING.xs,
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  message: {
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  actions: {
    gap: SPACING.sm,
  },
  actionButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
  },
  destructiveButton: {
    backgroundColor: `${COLORS.error}18`,
    borderColor: COLORS.error,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderColor: COLORS.glassBorder,
  },
  actionText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  destructiveText: {
    color: COLORS.error,
  },
  cancelText: {
    color: COLORS.textSecondary,
  },
});