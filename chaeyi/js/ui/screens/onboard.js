/**
 * 프로필 만들기 (첫 실행 / 둘째 아이 추가)
 *
 * 캐릭터와 색을 아이가 고르면 "누가 만들어 준 앱"이 아니라 "내 앱"이 된다.
 * 만들고 나서 보여주는 것보다 이 5분이 훨씬 세다.
 *
 * 학년은 이름표가 아니다. 초1이면 곱셈구구를 잠그고 덧뺄셈을 한 자리로 낸다.
 * 저금통은 아이마다 켜고 끈다 — 놀러 온 친구까지 용돈을 벌 필요는 없다.
 */

import { h } from '../dom.js';
import * as store from '../../state.js';
import * as grades from '../../grades.js';
import * as difficulty from '../../difficulty.js';
import * as allowance from '../../allowance.js';
import * as fx from '../../feedback.js';
import * as theme from '../../theme.js';
import * as cosmetics from '../../cosmetics.js';
import { avatar } from '../avatar.js';

/**
 * 처음 고르는 캐릭터.
 *
 * 여덟 갈래를 처음부터 다 고르게 하면 초2는 이름도 못 정하고 지친다.
 * 여기서는 완성된 캐릭터 중 하나만 고르고, 세부는 꾸미기 방에서 만진다.
 */
function facesFor() { return cosmetics.PRESETS; }

export function onboard(go, { first = true } = {}) {
  const faces = facesFor();
  let face = faces[Math.floor(Math.random() * faces.length)];
  let name = first ? '채이' : '';
  let grade = 2;
  let piggy = true;

  const nameInput = h('input', {
    value: name, maxlength: '8', placeholder: '이름', 'aria-label': '이름',
    style: {
      width: '100%', height: '58px', fontSize: '22px', fontWeight: '800',
      textAlign: 'center', border: '2px solid var(--line2)', borderRadius: '18px',
      background: 'var(--card)', color: 'var(--ink)',
    },
  });
  nameInput.addEventListener('input', () => { name = nameInput.value.trim(); });

  const grid = h('div', { class: 'pick-grid' });
  const paintFaces = () => {
    grid.replaceChildren(...faces.map((f, i) => h('button', {
      class: 'pick' + (f === face ? ' on' : ''),
      onclick: () => { face = f; fx.tap(); paintFaces(); },
      'aria-label': `캐릭터 ${i + 1}`,
      'aria-pressed': f === face ? 'true' : 'false',
    }, avatar(f.look, { size: 68 }))));
  };
  paintFaces();

  const gradeRow = h('div', {});
  const gradeNote = h('div', { class: 'muted', style: { marginTop: '8px' } });
  const paintGrades = () => {
    // 1~9를 한 줄에 늘어놓으면 버튼이 너무 작아진다. 초등/중등으로 묶는다.
    gradeRow.replaceChildren(...grades.GRADE_BANDS.map((band) =>
      h('div', { style: { marginBottom: '8px' } },
        h('div', { class: 'muted', style: { fontSize: '13px', marginBottom: '5px' } }, band.label),
        h('div', { class: 'grade-row' }, band.keys.map((g) => h('button', {
          class: 'btn btn-sm' + (g === grade ? '' : ' btn-ghost'),
          style: { flex: '1', minHeight: '48px', fontSize: '16px',
                   ...(g === grade ? { background: 'var(--grape)', color: '#fff',
                                       boxShadow: '0 3px 0 var(--grape-d)' } : {}) },
          onclick: () => {
            grade = g; fx.tap();
            piggyIcon.textContent = theme.copy('walletEmoji', g);
            paintGrades();
          },
        }, grades.GRADES[g].label))))));
    gradeNote.textContent = grades.of(grade).note;
  };
  paintGrades();

  const piggyIcon = h('div', { class: 'piggy-em' }, '🐷');
  const piggyBtn = h('button', { class: 'btn btn-sm' }, '켤게요');
  const paintPiggy = () => {
    piggyBtn.textContent = piggy ? '켤게요' : '안 쓸래요';
    piggyBtn.className = 'btn btn-sm' + (piggy ? '' : ' btn-ghost');
  };
  piggyBtn.addEventListener('click', () => { piggy = !piggy; fx.tap(); paintPiggy(); });
  paintPiggy();

  return h('div', { class: 'screen' },
    h('div', { style: { textAlign: 'center', padding: '14px 0 2px' } },
      h('div', { style: { fontSize: '42px' } }, first ? '👋' : '🙌'),
      h('div', { class: 'h1', style: { marginTop: '6px' } }, first ? '반가워요!' : '친구를 추가해요'),
      h('div', { class: 'muted' }, '이름을 쓰고, 좋아하는 친구를 골라요'),
    ),
    nameInput,
    h('div', { class: 'card' }, grid),

    h('div', { class: 'card' },
      h('div', { class: 'h2', style: { marginBottom: '10px' } }, '몇 학년이에요?'),
      gradeRow,
      gradeNote,
      h('div', { class: 'muted', style: { marginTop: '8px', fontSize: '13px' } },
        '초1~중3 내용이 들어 있어요. 고1 이상은 아직 없습니다'),
    ),

    h('div', { class: 'card row' },
      piggyIcon,
      h('div', { style: { flex: '1' } },
        h('div', { class: 'h2' }, '용돈 저금통'),
        h('div', { class: 'muted' }, '한 판 끝낼 때마다 돈이 쌓여요')),
      piggyBtn,
    ),

    h('div', { class: 'spacer' }),
    h('button', { class: 'btn btn-block', onclick: () => {
      fx.unlock();
      const id = store.createProfile({ name: name || '친구', grade });
      store.setActiveProfile(id);
      // 여기서 고른 캐릭터가 곧 꾸미기 옷장의 시작 차림이다. 온보딩과 옷장이
      // 따로 놀면 아이가 고른 얼굴이 홈에서 다른 걸로 보인다.
      cosmetics.applyPreset(face.look);
      // 학년에 맞는 난이도로 시작하고, 저금통 여부를 이 아이에게만 적용한다
      difficulty.setPreset(grades.of(grade).defaultPreset);
      allowance.setConfig({ enabled: piggy });
      // 첫 아이라면 부모 잠금부터 정한다. 저금통과 설정을 아이가 못 건드리게.
      go(first && !store.settings().parentPin ? 'lock' : 'placement',
         first ? { next: 'placement' } : undefined);
    } }, first ? '시작하기' : '만들기'),
    !first
      ? h('button', { class: 'btn btn-block btn-ghost', onclick: () => go('parent') }, '취소')
      : null,
    h('div', { style: { height: '8px' } }),
  );
}
