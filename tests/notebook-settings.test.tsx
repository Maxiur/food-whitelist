// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import Notebook from '../src/components/Notebook';
import type { FoodRepository } from '../src/lib/types';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
HTMLDialogElement.prototype.showModal = function () { this.open = true; };
HTMLDialogElement.prototype.close = function () { this.open = false; };

it('keeps multi-select filters while opening password settings and returning to the notebook', async () => {
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  const repository: FoodRepository = { list: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn(), remove: vi.fn(), restore: vi.fn(), setPinned: vi.fn() };
  const clickButton = async (text: string) => {
    const button = [...element.querySelectorAll('button')].find(item => item.textContent === text || item.getAttribute('aria-label') === text)!;
    expect(button).toBeTruthy(); await act(async () => button.click());
  };
  try {
    await act(async () => root.render(<Notebook repository={repository} mode="cloud" userEmail="owner@example.com" renderPasswordSettings={onBack => <button onClick={onBack}>Test return</button>} />));
    await act(async () => {
      element.querySelector('summary')!.click();
      const choices = [...element.querySelectorAll('.advanced-filters label')];
      choices.find(label => label.textContent === 'Warzywa')!.querySelector('input')!.click();
    });
    await act(async () => {
      [...element.querySelectorAll('.advanced-filters label')].find(label => label.textContent === 'Ryby i owoce morza')!.querySelector('input')!.click();
    });
    expect(element.querySelectorAll('.advanced-filters input:checked')).toHaveLength(2);
    expect(element.querySelector('details')!.open).toBe(true);
    await clickButton('Ustawienia');
    expect(element.querySelector('dialog')!.textContent).toContain('owner@example.com');
    await clickButton('Ustaw lub zmień hasło');
    await clickButton('Test return');
    await clickButton('Zamknij okno');
    expect(element.querySelector('dialog')).toBeNull();
    expect(element.querySelectorAll('.advanced-filters input:checked')).toHaveLength(2);
    await clickButton('Wyczyść wszystkie filtry');
    expect(element.querySelectorAll('.advanced-filters input:checked')).toHaveLength(0);
  } finally { await act(async () => root.unmount()); element.remove(); }
});
