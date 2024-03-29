import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { memo } from 'react';
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
  getDayName,
  getDaysInMonth,
  getDaysOfWeek,
  getMonthRange,
  sortMarkedDates,
} from './util';
import debounce from 'lodash/debounce';

export interface CalendarProps {
  passRange?: number;
  minDate?: number;
  maxDate?: number;
  selected?: string | Date;
  firstDay?: number;
  calendarWidth?: number;
  onSelectDate: (date: string | Date, source: EVENT_SOURCE) => void;
  theme?: CalendarTheme;
  markedDates?: {
    [x: string]: Marking;
  };
  renderHeader?: any;
  autoSelect?: 'firstday' | 'markedDate';
  onMonthChange?: (date: string) => void;
  style?: ViewStyle | ViewStyle[];
  dayNames?: string[];
  maxItemRender?: number;
  renderLoading?: any;
}

export interface CalendarRef {
  currentMonth: string;
  scrollToDate: (
    m: any,
    animated?: boolean,
    fireCallback?: boolean,
    forceScrollTo?: boolean
  ) => void;
  scrollToMonth: (
    m: any,
    animated?: boolean,
    fireCallback?: boolean,
    forceScrollTo?: boolean
  ) => void;
  scrollToNextMonth: (
    animated?: boolean,
    fireCallback?: boolean,
    forceScrollTo?: boolean
  ) => void;
  scrollToPrevMonth: (
    animated?: boolean,
    fireCallback?: boolean,
    forceScrollTo?: boolean
  ) => void;
}

const _META: any = {};

function _Calendar(
  {
    passRange = 12,
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
    onMonthChange,
    style,
    dayNames,
    maxItemRender = 1,
    renderLoading,
  }: CalendarProps,
  ref: any
) {
  const [id] = useState(Date.now());
  const daysOfWeek = getDaysOfWeek(firstDay);
  const [currentMonth, setCurrentMonth] = useState<string>('');
  const [months, setMonths] = useState<string[]>([]);
  const [firstIndex, setFirstIndex] = useState(0);
  const carousel = useRef<any>(null);
  const sortMarked = useMemo(() => sortMarkedDates(markedDates), [markedDates]);
  const [rendered, setRendered] = useState({});
  const [inited, setInited] = useState(false);
  theme = {
    ...defaultTheme,
    ...theme,
  };

  useEffect(() => {
    _META[id] = {};
    initCalendar();
  }, []);

  const initCalendar = () => {
    const _months = getMonthRange(selected, minDate, maxDate, passRange);
    const _month = _months.find((e) =>
      dayjs(e).isSame(selected || dayjs(), 'month')
    );
    const _firstIndex = _months.findIndex((e) =>
      dayjs(e).isSame(selected, 'month')
    );
    setMonths(_months);
    setCurrentMonth(_month as any);
    _META[id].month = _month;
    _META[id].disableAutoSelect = true;
    setFirstIndex(_firstIndex);
    if (_months.length) carousel.current?.snapToItem(_firstIndex, false);
    setInited(true);
  };

  const caculateMonthHeight = (d) => {
    return Math.abs(dayjs(d).startOf('month').diff(dayjs(d).endOf('month'))) > 5
      ? 242
      : 200;
  };

  const renderItem = ({ item }: { item: string | Date }) => {
    const needRender =
      rendered[item as any] ||
      Math.abs(dayjs(currentMonth).diff(item, 'month')) <= maxItemRender;

    if (needRender) {
      return (
        <MonthItem
          calendarWidth={calendarWidth}
          currentMonth={currentMonth}
          months={months}
          item={item}
          markedDates={markedDates}
          theme={theme}
          onDayPress={onDayPress}
          selected={selected}
        />
      );
    } else {
      return (
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            height: 200,
          }}
        >
          <Text style={styles.monthPlaceholder}>{item}</Text>
        </View>
      );
    }
  };

  const _renderHeader = () => {
    if (renderHeader) return renderHeader();
    return (
      <View style={[styles.header, theme.header]}>
        {daysOfWeek.map((day) => {
          return (
            <View key={day} style={{ flex: 1 }}>
              <Text style={[styles.headerItem, theme.dayName]}>
                {getDayName(day, dayNames)}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const onDayPress = (day: string | Date) => {
    const _month = _META[id].month;
    const currentIndex = months.indexOf(_month);
    if (dayjs(day).isBefore(_month, 'month') && currentIndex - 1 >= 0) {
      _META[id].disableAutoSelect = true;
      _META[id].month = months[currentIndex - 1];
      setCurrentMonth(months[currentIndex - 1]);
      carousel.current?.snapToPrev(true, false);
    } else if (
      dayjs(day).isAfter(_month, 'month') &&
      currentIndex + 1 < months.length
    ) {
      _META[id].disableAutoSelect = true;
      _META[id].month = months[currentIndex + 1];
      setCurrentMonth(months[currentIndex + 1]);
      carousel.current?.snapToNext(true, false);
    }
    _META[id].month = _month;
    onSelectDate && onSelectDate(day as any, EVENT_SOURCE.DAY_PRESS as any);
  };

  const onScrollIndexChanged = debounce((index: number) => {
    const month = months[index];
    _META[id].month = month;
    rendered[month] = true;
    setRendered({ ...rendered });
    setCurrentMonth(month);
    onMonthChange && onMonthChange(month);

    if (autoSelect) {
      if (_META[id].disableAutoSelect) {
        _META[id].disableAutoSelect = false;
        return;
      }
      let date;
      if (autoSelect === 'markedDate') {
        date = sortMarked.find((e) => dayjs(e).isSame(months[index], 'month'));
      }
      date = date || dayjsToString(dayjs(months[index]).startOf('month'));
      onSelectDate && onSelectDate(date, EVENT_SOURCE.PAGE_SCROLL as any);
    }
  }, 200);

  const scrollToDate = (
    m: any,
    animated = true,
    fireCallback = true,
    forceScrollTo = false
  ) => {
    const index = months.findIndex((e) => dayjs(m).isSame(e, 'month'));
    if (index >= 0) {
      _META[id].disableAutoSelect = true;
      carousel.current.snapToItem(index, animated, fireCallback, forceScrollTo);
      onSelectDate && onSelectDate(m, null as any);
    }
  };

  const scrollToMonth = (
    m: any,
    animated = true,
    fireCallback = true,
    forceScrollTo = false
  ) => {
    const index = months.findIndex((e) => dayjs(m).isSame(e, 'month'));
    if (index >= 0) {
      carousel.current.snapToItem(index, animated, fireCallback, forceScrollTo);
    }
  };

  const scrollToNextMonth = (
    animated = true,
    fireCallback = true,
    forceScrollTo = false
  ) => {
    const index = months.indexOf(currentMonth) + 1;
    if (index <= months.length - 1) {
      carousel.current.snapToItem(index, animated, fireCallback, forceScrollTo);
    }
  };

  const scrollToPrevMonth = (
    animated = true,
    fireCallback = true,
    forceScrollTo = false
  ) => {
    const index = months.indexOf(currentMonth) - 1;
    if (index >= 0) {
      carousel.current.snapToItem(index, animated, fireCallback, forceScrollTo);
    }
  };

  if (ref) {
    ref.current = {
      currentMonth,
      scrollToMonth,
      scrollToNextMonth,
      scrollToPrevMonth,
      scrollToDate,
    };
  }

  return (
    <View style={[{ backgroundColor: '#fff' }, style]}>
      {_renderHeader()}

      {inited ? (
        <Carousel
          ref={carousel}
          vertical={false}
          data={months}
          keyExtractor={(e) => e}
          firstItem={firstIndex}
          itemWidth={calendarWidth}
          sliderWidth={calendarWidth}
          inactiveSlideScale={1}
          inactiveSlideOpacity={1}
          renderItem={renderItem}
          onScrollIndexChanged={onScrollIndexChanged}
        />
      ) : (
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            height: caculateMonthHeight(selected),
          }}
        >
          {renderLoading ? (
            renderLoading()
          ) : (
            <Text style={styles.monthPlaceholder}>
              {dayjs(selected).format('MM-YYYY')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export const Calendar = forwardRef(_Calendar);

const _MonthItem = ({
  // @ts-ignore
  item, // @ts-ignore
  currentMonth, // @ts-ignore
  theme, // @ts-ignore
  markedDates, // @ts-ignore
  selected, // @ts-ignore
  onDayPress, // @ts-ignore
  calendarWidth, // @ts-ignore
  months,
}) => {
  const selectedString = selected ? dayjsToString(dayjs(selected)) : '';
  let daysOfMonth = getDaysInMonth(item);
  const isCurrent = dayjs(currentMonth).isSame(item, 'month');
  if (!isCurrent) daysOfMonth = daysOfMonth.slice(0, 7 * 5);
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
      }}
    >
      {daysOfMonth.map((day) => (
        <Day
          parent="month"
          key={day}
          day={day}
          month={item as any}
          width={calendarWidth / 7 - 1}
          isSelected={selectedString === day}
          marking={markedDates[day]}
          theme={theme}
          onPress={onDayPress}
          minMonth={months[0]}
          maxMonth={months[months.length - 1]}
        />
      ))}
    </View>
  );
};

const MonthItem = memo(_MonthItem, (prevProps, props) => {
  return compareProps(prevProps, props, [
    'item',
    'currentMonth',
    'theme',
    'markedDates',
    'selected',
    'onDayPress',
    'calendarWidth',
    'months',
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
    fontWeight: '500',
  },
  monthPlaceholder: { fontSize: 24, fontWeight: '500' },
});
