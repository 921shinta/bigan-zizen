// #MARK: 評価実験 (Googleフォーム収集版)
import { getHistory } from './_history.js';
// 先輩システム・自分のシステムの両方で同じファイルを使える。違いは CONFIG だけ。

// ============================================================
// ★ここだけ書き換える
// ============================================================
const CONFIG = {
	role: 'mine',   // 先輩のシステム='senior' / 自分のシステム='mine'(ログに入る)
	formAction: 'https://docs.google.com/forms/d/e/1FAIpQLSeiVfJibq_-MBvc3DcyJ_Bwwld2xmh-49j2JQqgdcVX47bNgg/formResponse', // このシステム用フォームの formResponse URL
	// Googleフォームの各質問の entry.数字
	entry: {
		participantId:    'entry.1850622523',
		reflect:          'entry.298132765',
		reflectedText:    'entry.1193266304',
		notReflectedText: 'entry.1992810340',
		satisfaction:     'entry.1813957504',
		colorShape:       'entry.1308875465',
		comfort:          'entry.1184266450',
		usability:        'entry.1591232395',
		usabilityText:    'entry.1208894362',
		requestText:      'entry.2105910398',
		systemLog:        'entry.1261567953',
		systemName:       'entry.279144770'   // 「システム」欄(先輩/自分を自動入力)
	},
	// 送信完了後に自動で移動する先。{id} は参加者IDに置き換わる
	//  先輩システム → 自分のシステムのURL / 自分のシステム → 最終アンケートのURL
	nextUrl: 'https://example.com/next/?id={id}',
	// 事前アンケートが未回答のとき戻す先(不要なら空文字)。pre.html のURLなど
	preUrl: ''
};
// ============================================================

const PID_KEY = 'bigan_participant_id';
const PRE_KEY = 'bigan_pre_done';

function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

function getParticipantId() {
	const q = new URLSearchParams(location.search).get('id');
	if (q) { safeSet(PID_KEY, q); return q; }
	return safeGet(PID_KEY) || '';
}

const elemValidateBtn = document.getElementById('validate');
// システムの読み込み(AIモデルなど)が終わる前に送信ボタンが押されても反応するよう、
// モジュール読み込み時点でクリックを受け付ける
if (elemValidateBtn) elemValidateBtn.addEventListener('click', validate);

export function enableEstimation() {
	// 事前アンケート未回答なら先にそちらへ
	if (CONFIG.preUrl && safeGet(PRE_KEY) !== '1') {
		const id = getParticipantId();
		location.replace(CONFIG.preUrl + (CONFIG.preUrl.includes('?') ? '&' : '?') + 'id=' + encodeURIComponent(id));
		return;
	}

	if (CONFIG.role !== 'mine') {
		const label = document.createElement('label');
		label.setAttribute('for', 'form_exp');
		label.innerText = '評価実験';
		document.getElementsByClassName('header-control')[0].appendChild(label);
	}
	// 自分のシステムは、ヘッダーの「評価実験」ボタンで表示する
	if (CONFIG.role !== 'mine') document.getElementById('estimation').removeAttribute('hidden');

	const elemId = document.getElementById('student_num');
	if (elemId) elemId.value = getParticipantId();

}

function validate() {
	const elemAnswers = document.querySelectorAll('#estimation form dd:has(input, textarea)');
	let hasError = false;
	elemAnswers.forEach(wrapper => {
		wrapper.classList.remove('error');
		const q = wrapper.previousElementSibling;
		const required = q && q.classList.contains('required');
		const a = wrapper.querySelector('input[type="radio"]:checked, input[type="text"], textarea');
		if (required && (a == null || !a.value.trim())) {
			hasError = true;
			wrapper.classList.add('error');
		}
	});
	if (hasError) {
		elemValidateBtn.classList.add('error');
		const first = document.querySelector('#estimation dd.error');
		if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
		let msg = document.getElementById('validate-msg');
		if (!msg) {
			msg = document.createElement('p');
			msg.id = 'validate-msg';
			msg.style.cssText = 'color:#d32f2f;font-weight:bold;margin-top:8px';
			elemValidateBtn.parentElement.appendChild(msg);
		}
		msg.innerText = '未回答の必須項目があります(赤くなっている質問)。';
		return;
	}
	const oldMsg = document.getElementById('validate-msg');
	if (oldMsg) oldMsg.remove();
	elemValidateBtn.classList.remove('error');
	send();
}

function buildLog(pid) {
	// 各世代の入力文(.genCycle の textarea)と、世代数・所要時間などを JSON で保存
	// 最後の空欄(まだ入力していない次世代の欄)は除く
	const evaluations = [...document.querySelectorAll('.genCycle textarea')].map(t => t.value).filter(v => v.trim() !== '');
	return JSON.stringify({
		role: CONFIG.role,
		participantId: pid,
		sentAt: new Date().toISOString(),
		generations: evaluations.length,
		history: getHistory(),
		evaluations
	});
}

async function send() {
	const form = document.getElementById('estimationForm');
	// ID欄に手入力された値も採用し、次のシステムへ引き継ぐ
	const idInput = document.getElementById('student_num');
	const pid = ((idInput ? idInput.value.trim() : '') || getParticipantId());
	if (pid) safeSet(PID_KEY, pid);
	const fd = new FormData();
	const missing = [];
	form.querySelectorAll('[data-key]').forEach(el => {
		const key = el.dataset.key;
		const name = CONFIG.entry[key];
		if (!name || name.includes('XXXX')) { missing.push(key); return; }
		if (el.type === 'radio') { if (el.checked) fd.set(name, el.value); }
		else if (key === 'systemLog') { /* 後で設定 */ }
		else if (key === 'participantId') { fd.set(name, pid); }
		else { fd.set(name, el.value); }
	});
	if (CONFIG.formAction.includes('XXXX') || missing.length) {
		alert('送信先(CONFIG)が未設定です。_estimation.js の CONFIG を設定してください。');
		return;
	}
	// 最後に表示されていた2枚(評価していない最終世代)も履歴に入れる
	try { if (window.recordFinalShown) window.recordFinalShown(); } catch (e) { console.warn(e); }

	const logEl = document.getElementById('system_log');
	const log = (logEl && logEl.value) ? logEl.value : buildLog(pid);
	fd.set(CONFIG.entry.systemLog, log);
	fd.set(CONFIG.entry.systemName, CONFIG.role === 'senior' ? '先輩' : '自分');

	elemValidateBtn.disabled = true;
	elemValidateBtn.innerText = '送信中...';
	try {
		await fetch(CONFIG.formAction, { method: 'POST', mode: 'no-cors', body: fd });
	} catch (e) {
		elemValidateBtn.disabled = false;
		elemValidateBtn.innerText = '送信する';
		alert('送信に失敗しました。通信状況を確認してもう一度押してください。');
		return;
	}
	const id = encodeURIComponent(pid);
	location.href = CONFIG.nextUrl.replace('{id}', id);
}