// The shared confirmation dialog behind account deletion, the GitHub garden's
// disconnect and the /dev deletes.
import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { BrandedConfirmDialog, type ConfirmRequest } from '../src/components/ui/BrandedConfirmDialog';

// jsdom has no modal dialogs.
const dialogProto = HTMLDialogElement.prototype as unknown as { showModal?: () => void; close?: () => void };
dialogProto.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
dialogProto.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); };

describe('BrandedConfirmDialog', () => {
  it('runs the action once for two presses that land before it re-renders', async () => {
    let runs = 0;
    let finish: () => void = () => {};
    const request: ConfirmRequest = {
      title: 'Delete it?',
      description: 'This cannot be undone.',
      actionLabel: 'Delete',
      onConfirm: () => { runs += 1; return new Promise<void>((resolve) => { finish = resolve; }); },
    };
    render(<LanguageProvider><BrandedConfirmDialog request={request} onClose={() => {}} /></LanguageProvider>);
    const action = await screen.findByRole('button', { name: 'Delete' });
    await act(async () => {
      action.click();
      action.click();
    });
    expect(runs).toBe(1);
    await act(async () => { finish(); });
  });
});
