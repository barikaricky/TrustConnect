import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Milestone, getQuotePdfUrl } from '../services/escrowService';

const NAVY = '#1a237e';
const GOLD = '#FFC107';

interface EscrowStatusCardProps {
  content: string;
  createdAt: string;
}

/**
 * Renders an escrow_status system message in the chat
 * (e.g. "Funds Secured", "Payment Released", "Auto-Released")
 */
export function EscrowStatusCard({ content, createdAt }: EscrowStatusCardProps) {
  const isSecured = content.includes('Secured') || content.includes('locked');
  const isReleased = content.includes('released') || content.includes('Released');
  const isAutoRelease = content.includes('Auto-release') || content.includes('Auto-released');
  const isRevision = content.includes('Revision') || content.includes('revision');

  let icon: keyof typeof Ionicons.glyphMap = 'shield-checkmark';
  let gradColors: [string, string] = [NAVY, '#283593'];

  if (isReleased) { icon = 'checkmark-circle'; gradColors = ['#1B5E20', '#2E7D32']; }
  else if (isAutoRelease) { icon = 'time'; gradColors = ['#E65100', '#F57C00']; }
  else if (isRevision) { icon = 'refresh-circle'; gradColors = ['#F57F17', '#FBC02D']; }
  else if (isSecured) { icon = 'lock-closed'; gradColors = [NAVY, '#303F9F']; }

  return (
    <View style={styles.escrowCardContainer}>
      <LinearGradient colors={gradColors} style={styles.escrowCardGradient}>
        <Ionicons name={icon} size={18} color={GOLD} />
        <Text style={styles.escrowCardText}>{content}</Text>
      </LinearGradient>
      <Text style={styles.escrowCardTime}>
        {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

interface MilestoneCardProps {
  content: string;
  milestoneIndex?: number;
  createdAt: string;
}

/**
 * Renders a milestone message in the chat
 * (e.g. "Milestone 'Foundation' (30%) released")
 */
export function MilestoneCard({ content, milestoneIndex, createdAt }: MilestoneCardProps) {
  const isComplete = content.includes('All milestones complete');
  return (
    <View style={styles.escrowCardContainer}>
      <LinearGradient
        colors={isComplete ? ['#1B5E20', '#2E7D32'] : [NAVY, '#283593']}
        style={styles.milestoneCardGradient}
      >
        <MaterialCommunityIcons
          name={isComplete ? 'trophy' : 'flag-checkered'}
          size={18}
          color={GOLD}
        />
        <View style={styles.milestoneCardContent}>
          <Text style={styles.milestoneCardTitle}>
            {isComplete ? 'All Milestones Complete!' : `Milestone ${(milestoneIndex ?? 0) + 1}`}
          </Text>
          <Text style={styles.milestoneCardBody}>{content}</Text>
        </View>
      </LinearGradient>
      <Text style={styles.escrowCardTime}>
        {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

interface MilestoneProgressProps {
  milestones: Milestone[];
  currentMilestone?: number;
}

/**
 * Milestone progress bar shown in the escrow action panel
 */
export function MilestoneProgress({ milestones, currentMilestone }: MilestoneProgressProps) {
  return (
    <View style={styles.milestonesContainer}>
      <Text style={styles.milestonesTitle}>Payment Milestones</Text>
      {milestones.map((ms, i) => {
        const isActive = i === currentMilestone;
        const isReleased = ms.status === 'released';
        return (
          <View key={i} style={styles.milestoneRow}>
            <View style={[
              styles.milestoneDot,
              isReleased && styles.milestoneDotDone,
              isActive && styles.milestoneDotActive,
            ]}>
              {isReleased ? (
                <Ionicons name="checkmark" size={10} color="#fff" />
              ) : (
                <Text style={styles.milestoneDotText}>{i + 1}</Text>
              )}
            </View>
            {i < milestones.length - 1 && (
              <View style={[styles.milestoneLine, isReleased && styles.milestoneLineDone]} />
            )}
            <View style={styles.milestoneInfo}>
              <Text style={[styles.milestoneLabel, isReleased && styles.milestoneLabelDone]}>
                {ms.label}
              </Text>
              <Text style={styles.milestoneAmount}>
                {ms.percent}% — ₦{ms.amount.toLocaleString()}
              </Text>
            </View>
            {isReleased && (
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={{ marginLeft: 4 }} />
            )}
          </View>
        );
      })}
    </View>
  );
}

interface QuotePdfButtonProps {
  quoteId: number;
  securityHash?: string;
}

/**
 * Download PDF button shown on quote cards
 */
export function QuotePdfButton({ quoteId, securityHash }: QuotePdfButtonProps) {
  const handlePress = async () => {
    const url = getQuotePdfUrl(quoteId, securityHash);
    try {
      await Linking.openURL(url);
    } catch {
      // silently fail
    }
  };

  return (
    <TouchableOpacity style={styles.pdfBtn} onPress={handlePress}>
      <MaterialCommunityIcons name="file-pdf-box" size={16} color={NAVY} />
      <Text style={styles.pdfBtnText}>View PDF</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Escrow status card
  escrowCardContainer: {
    alignItems: 'center',
    marginVertical: 6,
    paddingHorizontal: 20,
  },
  escrowCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '90%',
    gap: 8,
  },
  escrowCardText: {
    color: '#E8EAF6',
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  escrowCardTime: {
    fontSize: 10,
    color: '#90A4AE',
    marginTop: 3,
  },

  // Milestone card
  milestoneCardGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '90%',
    gap: 8,
  },
  milestoneCardContent: {
    flex: 1,
  },
  milestoneCardTitle: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  milestoneCardBody: {
    color: '#E8EAF6',
    fontSize: 12.5,
    lineHeight: 18,
  },

  // Milestone progress
  milestonesContainer: {
    backgroundColor: '#0d1020',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  milestonesTitle: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#37474F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneDotDone: {
    backgroundColor: '#4CAF50',
  },
  milestoneDotActive: {
    backgroundColor: GOLD,
  },
  milestoneDotText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  milestoneLine: {
    position: 'absolute',
    left: 9,
    top: 20,
    width: 2,
    height: 20,
    backgroundColor: '#37474F',
  },
  milestoneLineDone: {
    backgroundColor: '#4CAF50',
  },
  milestoneInfo: {
    marginLeft: 10,
    flex: 1,
  },
  milestoneLabel: {
    color: '#E8EAF6',
    fontSize: 12,
    fontWeight: '600',
  },
  milestoneLabelDone: {
    color: '#81C784',
    textDecorationLine: 'line-through',
  },
  milestoneAmount: {
    color: '#90A4AE',
    fontSize: 11,
    marginTop: 1,
  },

  // PDF button
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EAF6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  pdfBtnText: {
    color: NAVY,
    fontSize: 11,
    fontWeight: '600',
  },
});
