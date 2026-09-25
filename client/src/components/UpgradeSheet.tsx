// The upgrade sheet: one dialog, opened by a Premium lock or by the API
// client when the server answers 402. It says what Premium includes, what it
// costs with VAT, and offers "Go Premium" or "Not now". No urgency copy and no
// countdowns: the learner asked to open something, and this answers why not.
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { closeUpgradeSheet, type UpgradeRequest } from '../lib/upgradeSheet';
import { FREE_LEARN_LEVELS, PREMIUM_PRICE } from '../../../shared/tiers';
import { SUBJECT_SCOPE_CATALOG } from '../../../shared/subject-catalog';

const INCLUDES = [
  'premium.sheet.include1',
  'premium.sheet.include2',
  'premium.sheet.include3',
  'premium.sheet.include4',
  'premium.sheet.include5',
  'premium.sheet.include6',
] as const satisfies readonly TranslationKey[];

export default function UpgradeSheet({ request }: { request: UpgradeRequest }) {
  const t = useT();
  const navigate = useNavigate();
  const reactFree = FREE_LEARN_LEVELS.react ?? 0;
  const vars = {
    topics: SUBJECT_SCOPE_CATALOG.webdev.topics.length,
    level: reactFree + 1,
    symbol: PREMIUM_PRICE.symbol,
    monthly: PREMIUM_PRICE.monthly,
    annual: PREMIUM_PRICE.annual,
  };
  const reason = request.kind ? t(`premium.sheet.kind.${request.kind}` as TranslationKey) : null;
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => { if (!open) closeUpgradeSheet(); }}
      purpose="info"
      width="min(480px, calc(100vw - 32px))"
      className="ss-upgrade-sheet"
    >
      <DialogHeader
        title={t('premium.sheet.title')}
        subtitle={t('premium.sheet.subtitle', { level: reactFree })}
        onOpenChange={(open) => { if (!open) closeUpgradeSheet(); }}
      />
      <VStack gap={3} padding={4} width="100%">
        {reason && <Text type="body">{reason}</Text>}
        <div>
          <p className="ss-kicker ss-upgrade-sheet__kicker">{t('premium.sheet.includesTitle')}</p>
          <ul className="ss-upgrade-sheet__list">
            {INCLUDES.map((key) => <li key={key}>{t(key, vars)}</li>)}
          </ul>
        </div>
        <Text type="body" weight="semibold">{t('premium.sheet.price', vars)}</Text>
        <Text type="supporting" color="secondary">{t('premium.sheet.fair')}</Text>
        <HStack gap={1.5} justify="end" width="100%" wrap="wrap">
          <Button variant="ghost" label={t('premium.sheet.later')} onClick={closeUpgradeSheet} />
          <Button
            variant="primary"
            label={t('premium.sheet.cta')}
            onClick={() => { closeUpgradeSheet(); navigate('/premium'); }}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
