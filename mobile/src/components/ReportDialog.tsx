// A modal to report / flag a question, mirroring the web ReportDialog. Posts to
// the same backend queue the /dev Flags tab reads.
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useColors } from '../lib/useColors';
import { reportQuestion, type ReportReason } from '../lib/reportApi';
import { useT } from '../lib/i18n';
import { PrimaryButton } from './ui';

const REASONS: ReportReason[] = ['incorrect-answer', 'unclear', 'typo', 'outdated', 'duplicate', 'other'];

export function ReportDialog({
  questionId,
  visible,
  onClose,
}: {
  questionId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const c = useColors();
  const { t } = useT();
  const [reason, setReason] = useState<ReportReason>('incorrect-answer');
  const [detail, setDetail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');

  const submit = () => {
    setState('sending');
    reportQuestion({ questionId, reason, detail: detail.trim() || undefined })
      .then(() => setState('done'))
      .catch(() => setState('done')); // best-effort; always thank the reporter
  };

  const close = () => {
    setState('idle');
    setReason('incorrect-answer');
    setDetail('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]} onPress={() => {}}>
          {state === 'done' ? (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={[styles.title, { color: c.text }]}>{t('report.thanks')}</Text>
              <Text style={{ color: c.textSecondary, textAlign: 'center', marginTop: 6 }}>{t('report.thanksBody')}</Text>
              <PrimaryButton label={t('common.close')} onPress={close} style={{ marginTop: 16, alignSelf: 'stretch' }} />
            </View>
          ) : (
            <>
              <Text style={[styles.title, { color: c.text }]}>{t('report.title')}</Text>
              <View style={styles.reasons}>
                {REASONS.map((r) => {
                  const active = r === reason;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setReason(r)}
                      style={[styles.reason, { borderColor: active ? c.brand : c.border, backgroundColor: active ? c.brandSoft : 'transparent' }]}
                    >
                      <Text style={{ color: active ? c.brand : c.textSecondary, fontWeight: '600', fontSize: 13 }}>
                        {t(`report.reason.${r}` as never)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                value={detail}
                onChangeText={setDetail}
                placeholder={t('report.detailPlaceholder')}
                placeholderTextColor={c.textSecondary}
                multiline
                style={[styles.input, { color: c.text, borderColor: c.border }]}
              />
              <PrimaryButton
                label={t('report.submit')}
                onPress={submit}
                loading={state === 'sending'}
                style={{ marginTop: 12 }}
              />
              <Pressable onPress={close} style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ color: c.textSecondary }}>{t('common.cancel')}</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 16, borderWidth: 1, padding: 20 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reason: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12, minHeight: 64, textAlignVertical: 'top' },
});
