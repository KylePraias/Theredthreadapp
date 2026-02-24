import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface RoleBadgeProps {
  userType: 'individual' | 'organization' | 'admin' | 'developer';
  size?: 'small' | 'medium' | 'large';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ userType, size = 'medium' }) => {
  // Individual users don't get a badge
  if (userType === 'individual') {
    return null;
  }

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 22;
      default:
        return 18;
    }
  };

  const getContainerSize = () => {
    switch (size) {
      case 'small':
        return 18;
      case 'large':
        return 28;
      default:
        return 24;
    }
  };

  const iconSize = getIconSize();
  const containerSize = getContainerSize();

  const getBadgeConfig = () => {
    switch (userType) {
      case 'organization':
        return {
          icon: 'checkmark-circle',
          backgroundColor: '#2196f3',
          iconColor: '#fff',
        };
      case 'admin':
        return {
          icon: 'shield-checkmark',
          backgroundColor: '#9c27b0',
          iconColor: '#fff',
        };
      case 'developer':
        return {
          icon: 'code-slash',
          backgroundColor: '#ff5722',
          iconColor: '#fff',
        };
      default:
        return null;
    }
  };

  const config = getBadgeConfig();
  if (!config) return null;

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
          backgroundColor: config.backgroundColor,
        },
      ]}
    >
      <Ionicons name={config.icon as any} size={iconSize} color={config.iconColor} />
    </View>
  );
};

// For displaying next to display names inline
interface InlineRoleBadgeProps {
  userType: 'individual' | 'organization' | 'admin' | 'developer';
  size?: number;
}

export const InlineRoleBadge: React.FC<InlineRoleBadgeProps> = ({ userType, size = 16 }) => {
  // Individual users don't get a badge
  if (userType === 'individual') {
    return null;
  }

  const getBadgeConfig = () => {
    switch (userType) {
      case 'organization':
        return {
          icon: 'checkmark-circle',
          color: '#2196f3',
        };
      case 'admin':
        return {
          icon: 'shield-checkmark',
          color: '#9c27b0',
        };
      case 'developer':
        return {
          icon: 'code-slash',
          color: '#ff5722',
        };
      default:
        return null;
    }
  };

  const config = getBadgeConfig();
  if (!config) return null;

  return (
    <Ionicons
      name={config.icon as any}
      size={size}
      color={config.color}
      style={styles.inlineBadge}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineBadge: {
    marginLeft: 4,
  },
});

export default RoleBadge;
