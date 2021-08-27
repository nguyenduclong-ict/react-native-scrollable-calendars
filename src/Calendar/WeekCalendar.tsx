import debounce from 'lodash/debounce';
import React, {
  forwardRef,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Carousel from '../Carousel/Carousel';
import { dayjs } from '../Utils/time';
import { wWidth } from '../Utils/utils';
import { EVENT_SOURCE } from './constants';
import Day from './Day';
import { CalendarTheme, defaultTheme, Marking } from './theme';
import {
  compareProps,
  dayjsToString,
  getDatesOfWeek,
  getDayName,
  getDaysOfWeek,
  getWeekRange,
  sortMarkedDates,
} from './util';

export interface WeekCalendarProps {
  passRange?: number;
  minDate?: number;
  maxDate?: number;
  selected?: string | Date;
  firstDay?: number;
  calendarWidth?: number;
  theme?: CalendarTheme;
  markedDates?: {
    [x: string]: Marking;
  };
  renderDayNames?: any;
  renderHeader?: any;
  autoSelect?: 'firstday' | 'markedDate';
  onSelectDate: (date: string | Date, source: EVENT_SOURCE) => void;
  onWeekChange?: (date: string) => void;
  style?: ViewStyle | ViewStyle[];
}

export interface WeekCalendarRef {
  currentWeek: string;
  scrollToDate: (
    m: any,
    animated?: boolean,
    fireCallback?: boolean,
    forceScrollTo?: boolean
  ) => void;
  scrollToWeek: (
    m: any,
    animated?: boolean,
    autoSelect?: boolean,
    fireCallback?: boolean,
    forceScrollTo?: boolean
  ) => void;
  scrollToNextWeek: (
    animated?: boolean,
    fireCallback?: boolean,
    forceScrollTo?: boolean
  ) => void;
  scrollToPrevWeek: (
    animated?: boolean,
    fireCallback?: boolean,
    forceScrollTo?: boolean
  ) => void;
}

const _META: any = {};

function _WeekCalendar(
  {
    passRange = 12 * 4,
    minDate,
    maxDate,
    selected,
    firstDay = 1,
    calendarWidth = wWidth,
    onSelectDate,
    markedDates = {},
    theme = {},
    autoSelect,
    renderHeader,
    onWeekChange,
    style,
  }: WeekCalendarProps,
  ref: any
) {
  const [id] = useState(Date.now());
  const daysOfWeek = getDaysOfWeek(firstDay);
  const [currentWeek, setCurrentWeek] = useState<string>('');
  const [weeks, setWeeks] = useState<string[]>([]);
  const [firstIndex, setFirstIndex] = useState(0);
  const carousel = useRef<any>(null);
  theme = {
    ...defaultTheme,
    ...theme,
  };
  const sortMarked = useMemo(() => sortMarkedDates(markedDates), [markedDates]);

  useEffect(() => {
    _META[id] = {};
    initCalendar();
  }, []);

  const initCalendar = () => {
    const _weeks = getWeekRange(selected, minDate, maxDate, passRange);
    const _week = _weeks.find((e) =>
      dayjs(e).isSame(selected || dayjs(), 'week')
    );
    const _firstIndex = _weeks.findIndex((e) =>
      dayjs(e).isSame(selected, 'week')
    );
    setWeeks(_weeks);
    setCurrentWeek(_week as any);
    _META[id].week = _week;
    setFirstIndex(_firstIndex);
    _META[id].disableAutoSelect = true;
    if (_weeks.length) carousel.current?.snapToItem(_firstIndex, false);
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: string | Date;
    index: number;
  }) => {
    return (
      <WeekItem
        calendarWidth={calendarWidth}
        currentWeek={currentWeek}
        firstDay={firstDay}
        index={index}
        item={item}
        markedDates={markedDates}
        theme={theme}
        onDayPress={onDayPress}
        selected={selected}
      />
    );
  };

  const _renderHeader = () => {
    if (renderHeader) return renderHeader();
    return (
      <View style={styles.header}>
        {daysOfWeek.map((day) => {
          return (
            <View key={day} style={{ flex: 1 }}>
              <Text style={[styles.headerItem]}>{getDayName(day)}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const onDayPress = (day: string | Date) => {
    onSelectDate && onSelectDate(day as any, EVENT_SOURCE.DAY_PRESS as any);
  };

  const onScrollIndexChanged = debounce((index: number) => {
    const date = weeks[index];
    if (date !== currentWeek) {
      setCurrentWeek(date);
      onWeekChange && onWeekChange(date);
      if (autoSelect) autoSnap(index);
    }
  }, 200);

  const autoSnap = (index) => {
    if (_META[id].disableAutoSelect) {
      _META[id].disableAutoSelect = false;
      return;
    }
    let date;
    if (autoSelect === 'markedDate') {
      date = sortMarked.find((e) => dayjs(e).isSame(weeks[index], 'week'));
    }
    date = date || dayjsToString(dayjs(weeks[index]).startOf('week'));
    onSelectDate && onSelectDate(date, EVENT_SOURCE.PAGE_SCROLL as any);
  };

  const scrollToDate = (
    m: any,
    animated = true,
    fireCallback = true,
    forceScrollTo = false
  ) => {
    const index = weeks.findIndex((e) => dayjs(m).isSame(e, 'week'));
    if (index >= 0) {
      _META[id].disableAutoSelect = true;
      carousel.current.snapToItem(index, animated, fireCallback, forceScrollTo);
      onSelectDate && onSelectDate(m, null as any);
    }
  };

  const scrollToWeek = (
    m: any,
    animated = true,
    fireCallback = true,
    forceScrollTo = false
  ) => {
    const index = weeks.findIndex((e) => dayjs(m).isSame(e, 'week'));
    if (index >= 0) {
      carousel.current.snapToItem(index, animated, fireCallback, forceScrollTo);
    }
  };

  const scrollToNextWeek = (
    animated = true,
    fireCallback = true,
    forceScrollTo = false
  ) => {
    const index = weeks.indexOf(currentWeek) + 1;
    if (index <= weeks.length - 1) {
      carousel.current.snapToItem(index, animated, fireCallback, forceScrollTo);
    }
  };

  const scrollToPrevWeek = (
    animated = true,
    fireCallback = true,
    forceScrollTo = false
  ) => {
    const index = weeks.indexOf(currentWeek) - 1;
    if (index >= 0) {
      carousel.current.snapToItem(index, animated, fireCallback, forceScrollTo);
    }
  };

  if (ref)
    ref.current = {
      scrollToDate,
      scrollToWeek,
      scrollToNextWeek,
      scrollToPrevWeek,
    };

  return (
    <View style={[{ backgroundColor: '#fff' }, style]}>
      {_renderHeader()}
      <Carousel
        ref={carousel}
        vertical={false}
        data={weeks}
        keyExtractor={(e) => e}
        firstItem={firstIndex}
        itemWidth={calendarWidth}
        sliderWidth={calendarWidth}
        inactiveSlideScale={1}
        inactiveSlideOpacity={1}
        renderItem={renderItem}
        onScrollIndexChanged={onScrollIndexChanged}
      />
    </View>
  );
}

export const WeekCalendar = forwardRef(_WeekCalendar);

const _WeekItem = ({
  // @ts-ignore
  item, // @ts-ignore
  currentWeek, // @ts-ignore
  index, // @ts-ignore
  theme, // @ts-ignore
  markedDates, // @ts-ignore
  firstDay, // @ts-ignore
  selected, // @ts-ignore
  onDayPress, // @ts-ignore
  calendarWidth,
}) => {
  const needRender = Math.abs(dayjs(currentWeek).diff(item, 'week')) <= 1;
  if (needRender) {
    const selectedString = selected ? dayjsToString(dayjs(selected)) : '';
    let dates = getDatesOfWeek(item as any, firstDay);
    return (
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        {dates.map((day) => (
          <Day
            parent="week"
            key={day}
            day={day}
            width={calendarWidth / 7 - 1}
            isSelected={selectedString === day}
            marking={markedDates[day]}
            theme={theme}
            onPress={onDayPress}
          />
        ))}
      </View>
    );
  } else {
    return (
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text>{dayjs(item).format('MM/YYYY')}</Text>
      </View>
    );
  }
};

const WeekItem = memo(_WeekItem, (prevProps, props) => {
  return compareProps(prevProps, props, [
    'item',
    'currentWeek',
    'index',
    'theme',
    'markedDates',
    'firstDay',
    'selected',
    'onDayPress',
    'calendarWidth',
  ]);
});

const styles = StyleSheet.create({
  header: {
    height: 32,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  headerItem: {
    textAlign: 'center',
    color: '#000',
  },
  weekPlaceholder: { fontSize: 20, fontWeight: '500' },
});
