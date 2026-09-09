# -*- coding: utf-8 -*-
"""
Les PROMESSES des écrans, et celles qu'aucun test ne retient (chantier 68, 09/09/2026).

    python outils/promesses-sans-filet.py

⚠️ **À relancer avant et après chaque écran refondu.** Il ne dit pas si un écran est beau : il dit
combien de ses phrases pourraient disparaître sans que rien ne proteste.

⚠️ Produit une liste À VÉRIFIER, jamais un verdict.

Une promesse, ici, est une phrase VISIBLE par l'utilisateur qui énonce une limite, un refus ou une
garantie : « jamais », « aucun », « ne … pas », « impossible », « définitif », « seul ». Ce sont
précisément les phrases durement gagnées de ce projet — celles qui disent ce que la plateforme NE
fait pas — et précisément celles qu'une refonte laisse tomber sans que rien ne proteste.
"""
import io
import os
import re

# Le dossier `apps/web`, quel que soit l'endroit d'où on lance l'outil.
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
SORTIE = BASE + 'outils/promesses-sans-filet.txt'  # jamais commis : c'est une mesure, pas une source

# Marqueurs d'une limite énoncée, pas d'un simple libellé.
MARQUEURS = re.compile(
    r"\b(jamais|aucun\w*|impossible|définitiv\w*|ne\s+\w+\s+pas|n['’]\w+\s+pas|ne\s+peut|ne\s+sera|"
    r"seul\w*|n['’]existe|sans\s+\w+|pas\s+de\b|refuse|interdit)\b",
    re.I,
)


def phrases_visibles(source: str) -> list:
    """Le texte français rendu à l'écran, hors commentaires et hors code."""
    # Retirer les commentaires : c'est du raisonnement, pas de l'affichage.
    sans = re.sub(r'/\*.*?\*/', ' ', source, flags=re.S)
    sans = re.sub(r'^\s*//.*$', ' ', sans, flags=re.M)

    trouvees = set()
    # Texte entre balises JSX : > texte < — et chaînes littérales assez longues.
    for m in re.finditer(r'>([^<>{}]{40,400})<', sans):
        trouvees.add(m.group(1))
    for m in re.finditer(r"'([^'\\\n]{40,400})'", sans):
        trouvees.add(m.group(1))
    for m in re.finditer(r'"([^"\\\n]{40,400})"', sans):
        trouvees.add(m.group(1))

    propres = []
    for t in trouvees:
        t = re.sub(r'\s+', ' ', t).strip()
        # Écarter ce qui est visiblement du code ou des classes CSS.
        if not t or '=' in t or t.startswith('@') or re.search(r'[{}$]', t):
            continue
        if re.search(r'\b(flex|grid|rounded|text-\[|border|bg-|px-|py-|gap-|size-)\b', t):
            continue
        # Il faut de vraies lettres françaises, pas un identifiant.
        if len(re.findall(r'[a-zàâçéèêëîïôûùüÿœ]', t)) < 25:
            continue
        propres.append(t)
    return propres


def retenue(phrase: str, corpus: str) -> bool:
    """
    Un test retient-il cette phrase ?

    ⚠️ Chercher le DÉBUT de la phrase ne prouve rien : un test cite presque toujours un fragment du
    milieu, souvent en expression régulière. On cherche donc n'importe quelle fenêtre de cinq mots
    consécutifs — assez longue pour être distinctive, assez courte pour survivre à une citation
    partielle.
    """
    mots = [m for m in re.split(r'\s+', phrase) if m]
    if len(mots) < 4:
        return phrase.lower() in corpus
    for i in range(len(mots) - 3):
        fenetre = ' '.join(mots[i : i + 4]).lower()
        if fenetre in corpus:
            return True
    return False


def main() -> None:
    tests = []
    for racine, _, fichiers in os.walk(BASE + 'src/test'):
        for f in fichiers:
            if f.endswith(('.ts', '.tsx')):
                tests.append(io.open(os.path.join(racine, f), encoding='utf-8').read())
    corpus_tests = re.sub(r'\s+', ' ', '\n'.join(tests))

    ecrans = []
    for racine, _, fichiers in os.walk(BASE + 'src/modules'):
        for f in fichiers:
            if f.endswith('Page.tsx') or (f.startswith('Section') and f.endswith('.tsx')):
                ecrans.append(os.path.join(racine, f))
    ecrans.sort()

    lignes = ['LES PROMESSES DES ÉCRANS ET CE QUI LES RETIENT', '=' * 60, '']
    total, tenues = 0, 0
    detail = []

    for chemin in ecrans:
        source = io.open(chemin, encoding='utf-8').read()
        promesses = [p for p in phrases_visibles(source) if MARQUEURS.search(p)]
        nom = chemin.replace(BASE + 'src/modules/', '').replace('\\', '/')
        nues = []
        for p in promesses:
            total += 1
            # Le test cite-t-il un fragment reconnaissable de cette phrase ?
            if retenue(p, corpus_tests.lower()):
                tenues += 1
            else:
                nues.append(p)
        lignes.append('%-52s %2d promesse(s) · %2d sans test' % (nom, len(promesses), len(nues)))
        if nues:
            detail.append((nom, nues))

    lignes.append('')
    lignes.append('TOTAL : %d promesses · %d retenues par un test · %d nues' % (total, tenues, total - tenues))
    lignes.append('')
    lignes.append('=' * 60)
    lignes.append('LE DÉTAIL DES PROMESSES NUES')
    lignes.append('=' * 60)
    for nom, nues in detail:
        lignes.append('')
        lignes.append('── ' + nom + ' ──')
        for p in nues:
            lignes.append('   • ' + (p[:150] + '…' if len(p) > 150 else p))

    io.open(SORTIE, 'w', encoding='utf-8').write('\n'.join(lignes))
    print('\n'.join(lignes[: lignes.index('') + 30]))
    print('\n… détail complet dans promesses.txt')


main()
