import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/theme';

interface InputProps extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  errorMessage?: string;
}

export function Input({ label, icon, isPassword, errorMessage, ...rest }: InputProps) {
  const [isSecure, setIsSecure] = useState(isPassword);

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        {icon && <Ionicons name={icon} size={18} color={colors.textSecondary} style={styles.labelIcon} />}
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={[styles.inputWrapper, errorMessage ? styles.inputError : null]}>
        <TextInput
          style={styles.input}
          secureTextEntry={isSecure}
          placeholderTextColor={colors.border}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setIsSecure(!isSecure)} style={styles.eyeIcon}>
            <Ionicons name={isSecure ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelIcon: {
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: 'red',
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#000',
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
