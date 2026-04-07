/**
 * InvoiceCard — Reusable invoice/quote display card
 * Shows labor, materials, service fee, and grand total with action buttons.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const NAVY = '#1a237e';
const GOLD = '#FFC107';
const SUCCESS = '#4CAF50';
const DANGER = '#F44336';
const WARNING = '#FF9800';

export interface InvoiceData {
  description?: string;
  laborCost: number;
  materialsCost: number;
  serviceFee: number;
  grandTotal: number;
  estimatedDuration?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'revision_requested';
}

interface InvoiceCardProps {
  invoice: InvoiceData;
  senderName?: string;
  isOwner?: boolean;
  canRespond?: boolean;
  loading?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onRequestRevision?: () => void;
  style?: object;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: WARNING, icon: 'clock-outline' },
  accepted: { label: 'Accepted', color: SUCCESS, icon: 'check-circle' },
  rejected: { label: 'Rejected', color: DANGER, icon: 'close-circle' },
  revision_requested: { label: 'Revision Requested', color: WARNING, icon: 'pencil-circle' },
};

export default function InvoiceCard({
  invoice,
  senderName,
  isOwner = false,
  canRespond = false,
  loading = false,
  onAccept,
  onReject,
  onRequestRevision,
  style,
}: InvoiceCardProps) {
  const statusInfo = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.pending;

  return (
    <View style={[styles.card, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="receipt" size={18} color={GOLD} />
          <Text style={styles.headerTitle}>
            {isOwner ? 'Invoice Sent' : `Invoice from ${senderName || 'Artisan'}`}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
          <MaterialCommunityIcons name={statusInfo.icon as any} size={14} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>
      </View>

      {/* Description */}
      {invoice.description && (
        <Text style={styles.description}>{invoice.description}</Text>
      )}

      {/* Line Items */}
      <View style={styles.lineItems}>
        <View style={styles.lineItem}>
          <Text style={styles.lineLabel}>Labour</Text>
          <Text style={styles.lineValue}>₦{invoice.laborCost.toLocaleString()}</Text>
        </View>
        <View style={styles.lineItem}>
          <Text style={styles.lineLabel}>Materials</Text>
          <Text style={styles.lineValue}>₦{invoice.materialsCost.toLocaleString()}</Text>
        </View>
        <View style={styles.lineItem}>
          <Text style={styles.lineLabel}>Service Fee (5%)</Text>
          <Text style={styles.lineValue}>₦{invoice.serviceFee.toLocaleString()}</Text>
        </View>
        {invoice.estimatedDuration && (
          <View style={styles.lineItem}>
            <Text style={styles.lineLabel}>Est. Duration</Text>
            <Text style={styles.lineValue}>{invoice.estimatedDuration}</Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₦{invoice.grandTotal.toLocaleString()}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      {canRespond && invoice.status === 'pending' && (
        <View style={styles.actions}>
          {loading ? (
            <ActivityIndicator size="small" color={NAVY} />
          ) : (
            <>
              <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
                <MaterialCommunityIcons name="check" size={16} color="#fff" />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.revisionBtn} onPress={onRequestRevision}>
                <MaterialCommunityIcons name="pencil" size={16} color={WARNING} />
                <Text style={styles.revisionBtnText}>Revise</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
                <MaterialCommunityIcons name="close" size={16} color={DANGER} />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EAF6',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: NAVY,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    color: '#546E7A',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  lineItems: {
    padding: 14,
    gap: 6,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineLabel: {
    fontSize: 13,
    color: '#78909C',
  },
  lineValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#37474F',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: SUCCESS,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    paddingTop: 0,
    justifyContent: 'center',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SUCCESS,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  revisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: WARNING + '15',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WARNING + '30',
  },
  revisionBtnText: {
    color: WARNING,
    fontSize: 13,
    fontWeight: '600',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DANGER + '10',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DANGER + '20',
  },
  rejectBtnText: {
    color: DANGER,
    fontSize: 13,
    fontWeight: '600',
  },
});
