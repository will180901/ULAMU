/**
 * @format
 * Non-régression de la « boucle des retours ».
 *
 * Le bouton retour matériel reste écouté par `AuthPage` pendant qu'une confirmation est affichée.
 * Chaque nouvel appui rappelait donc le garde-fou, qui rouvrait une confirmation par-dessus la
 * précédente : la boîte semblait se refermer puis revenir sans fin, et l'écran devenait impossible
 * à quitter. Ces tests figent le contrat : UNE confirmation à la fois, et le verrou se relâche une
 * fois la question tranchée.
 */
import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {useAbandonGuard} from '../src/state/useAbandonGuard';

const mockConfirm = jest.fn<() => Promise<boolean>>();
jest.mock('../src/components/Dialog', () => ({
  useDialog: () => ({confirm: mockConfirm}),
}));

/** Monte le hook et publie la fonction de sortie qu'il renvoie. */
function Harness({
  dirty,
  onLeave,
  slot,
}: {
  dirty: boolean;
  onLeave: () => void;
  slot: {guard?: () => Promise<void>};
}) {
  slot.guard = useAbandonGuard({dirty, title: 'Abandonner ?', message: 'Perte de saisie.', onLeave});
  return null;
}

async function mount(dirty: boolean, onLeave: () => void) {
  const slot: {guard?: () => Promise<void>} = {};
  await act(async () => {
    TestRenderer.create(<Harness dirty={dirty} onLeave={onLeave} slot={slot} />);
  });
  return () => slot.guard!();
}

describe('useAbandonGuard', () => {
  beforeEach(() => {
    mockConfirm.mockReset();
  });

  it("n'ouvre qu'UNE confirmation même si le retour est pressé plusieurs fois", async () => {
    let trancher!: (v: boolean) => void;
    mockConfirm.mockReturnValue(
      new Promise<boolean>(res => {
        trancher = res;
      }),
    );
    const onLeave = jest.fn();
    const guard = await mount(true, onLeave);

    // Trois appuis successifs sur le bouton retour matériel, boîte encore affichée.
    const appuis = [guard(), guard(), guard()];
    expect(mockConfirm).toHaveBeenCalledTimes(1);

    // « Continuer » : on reste sur l'écran, et AUCUNE autre boîte n'a été empilée.
    await act(async () => {
      trancher(false);
      await Promise.all(appuis);
    });
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('relâche le verrou : un appui ultérieur repose bien la question', async () => {
    mockConfirm.mockResolvedValue(false);
    const onLeave = jest.fn();
    const guard = await mount(true, onLeave);

    await act(async () => {
      await guard();
    });
    await act(async () => {
      await guard();
    });
    expect(mockConfirm).toHaveBeenCalledTimes(2);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('« Abandonner » quitte bien l\'écran', async () => {
    mockConfirm.mockResolvedValue(true);
    const onLeave = jest.fn();
    const guard = await mount(true, onLeave);

    await act(async () => {
      await guard();
    });
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('ne retient personne sur un formulaire resté vierge', async () => {
    const onLeave = jest.fn();
    const guard = await mount(false, onLeave);

    await act(async () => {
      await guard();
    });
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
