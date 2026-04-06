import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing } from '../config/theme';
import { useAuth } from '../services/AuthContext';

/**
 * RoleSwitcher - Temporary development tool for Sprint 2
 * 
 * Allows switching between user roles to test navigation
 * This will be REMOVED in production
 */

export default function RoleSwitcher() {
  const { userRole, switchRole, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Dev Tool - Switch Role</Text>
      
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, userRole === 'customer' && styles.buttonActive]}
          onPress={() => switchRole('customer')}
        >
          <Text style={[styles.buttonText, userRole === 'customer' && styles.buttonTextActive]}>
            👤 Customer
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, userRole === 'artisan' && styles.buttonActive]}
          onPress={() => switchRole('artisan')}
        >
          <Text style={[styles.buttonText, userRole === 'artisan' && styles.buttonTextActive]}>
            🔧 Artisan
          </Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>
      
      <Text style={styles.hint}>This tool is for Sprint 2 testing only</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.warning,
    borderStyle: 'dashed',
  },
  
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  
  button: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.neutral.lightGray,
  },
  
  buttonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  
  buttonTextActive: {
    color: colors.text.inverse,
  },
  
  logoutButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  
  hint: {
    fontSize: 10,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
