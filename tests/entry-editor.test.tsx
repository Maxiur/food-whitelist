// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { EntryEditor } from '../src/components/Notebook';
import { draftKey, readDraft } from '../src/lib/entry-draft';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
HTMLDialogElement.prototype.showModal = function () { this.open = true; };
HTMLDialogElement.prototype.close = function () { this.open = false; };
it('keeps the dialog open on backdrop click and restores the draft across remounts', async () => {
  sessionStorage.clear();
  const element = document.createElement('div'); document.body.append(element);
  let root = createRoot(element);
  const close = vi.fn(), save = vi.fn().mockResolvedValue(undefined);
  const render = () => act(async () => root.render(<EntryEditor entry={null} scope="test-user" onClose={close} onSave={save} />));
  try {
    await render();
    await act(async () => {
      const input = element.querySelector<HTMLInputElement>('#food-name')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Test entry');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      element.querySelector('dialog')!.click();
    });
    expect(close).not.toHaveBeenCalled();
    await act(async () => {
      const label = Array.from(element.querySelectorAll('.category-options label')).find(label => label.textContent === 'Słodycze')!;
      (label.querySelector('input') as HTMLInputElement).click();
    });
    await act(async () => root.unmount());
    root = createRoot(element); await render();
    expect(element.querySelector<HTMLInputElement>('#food-name')!.value).toBe('Test entry');
    expect(readDraft(draftKey('test-user'))?.categories).toEqual(['Other', 'Sweets']);
    expect(readDraft(draftKey('different-user'))).toBeNull();
    await act(async () => { element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Test entry', categories: ['Other', 'Sweets'] }));
    expect(readDraft(draftKey('test-user'))).toBeNull();
  } finally { await act(async () => root.unmount()); element.remove(); }
});
