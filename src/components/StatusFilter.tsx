import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { TaskStatus } from '../types/task';
import { COLORS } from '../constants/theme';

export type FilterOption = 'All' | TaskStatus;

interface StatusFilterProps {
  currentFilter: FilterOption;
  onSelectFilter: (filter: FilterOption) => void;
  counts: {
    all: number;
    todo: number;
    inProgress: number;
    done: number;
  };
}

export const StatusFilter: React.FC<StatusFilterProps> = ({
  currentFilter,
  onSelectFilter,
  counts,
}) => {
  const filters: { key: FilterOption; label: string; count: number }[] = [
    { key: 'All', label: 'All', count: counts.all },
    { key: 'To Do', label: 'To Do', count: counts.todo },
    { key: 'In Progress', label: 'In Progress', count: counts.inProgress },
    { key: 'Done', label: 'Done', count: counts.done },
  ];

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {filters.map((item) => {
          const isSelected = currentFilter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelectFilter(item.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {item.label}
              </Text>
              <View style={[styles.countBadge, isSelected && styles.countBadgeSelected]}>
                <Text style={[styles.countText, isSelected && styles.countTextSelected]}>
                  {item.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  chipTextSelected: {
    color: '#FFF',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
  },
  countBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  countTextSelected: {
    color: '#FFF',
  },
});
