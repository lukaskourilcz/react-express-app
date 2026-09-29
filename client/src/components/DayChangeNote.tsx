import { Text } from '@astryxdesign/core/Text';
import { useT } from '../i18n/LanguageContext';
import { useDayChangeTime } from '../lib/utcDay';

/** One quiet line under anything that counts "today": the streak, Today's
 * target. Days are UTC days on the server; this says when one ends here. */
export function DayChangeNote({ justify }: { justify?: 'center' }) {
  const t = useT();
  const time = useDayChangeTime();
  return (
    <Text type="supporting" size="xsm" color="secondary" justify={justify}>
      {t('dayChange.note', { time })}
    </Text>
  );
}
