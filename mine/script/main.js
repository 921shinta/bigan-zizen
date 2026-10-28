import * as Population from "./_population.js";
import appendGenCycle from "./_appendGenCycle.js";
import drawCanvas, { setupCanvasCamera } from "./_drawCanvas.js";
import getImpression from "./_getImpression.js";
import { setFitnessScore, makeEvaluateRule, analyzeInitialText } from "./_evaluate.js";
import getTables from "./_getTables.js";
import * as Estimation from "./_estimation.js";
import { loadModel, preloadDictVectors } from "./_similarity.js";
// 評価実験用: 画像の遺伝子・評価文・操作の履歴
import { recordShown, recordEvaluate, recordEvent } from "./_history.js";

export const dics = new Object();
export const evaluateRules = [];

// ★ 古いプログラムをオフにする設定
const isAvailableEstimation = true;

// ★ 実験ログ（入力履歴）を貯めておくための配列を追加
window.experimentLogs = [];

// ★ 戻る機能のための状態保存用履歴を追加
window.generationHistory = [];

// ★ ドラッグ中かどうかを判定するフラグ（光る演出用）
window.isDragging = false; 

// #MARK: 初期処理
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('toggleManual').addEventListener('click', () => {
        document.getElementById('manualPopup').classList.toggle('hidden');
    });

    // ★ 戻る（アンドゥ）ボタンの処理
    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            if (window.generationHistory.length === 0) return;

            // 履歴から一つ前の状態を取り出す
            const prevState = window.generationHistory.pop();

            // 1. 最新の世代のDOM（画面）を完全に削除する
            const mainElem = document.querySelector('main');
            if (mainElem && mainElem.lastElementChild) { 
                mainElem.removeChild(mainElem.lastElementChild);
            }

            // 2. 評価ルールを前の状態に復元する
            evaluateRules.length = 0;
            evaluateRules.push(...prevState.evaluateRulesBackup);

            // 3. population（個体群データや世代数）を、ミューテーション（変化）前の状態に完全復元する
            Object.keys(prevState.populationRef).forEach(key => delete prevState.populationRef[key]);
            Object.assign(prevState.populationRef, prevState.populationBackup);

            // 4. 前の世代の入力欄と決定ボタンを再び有効化する
            const prevGenIndex = prevState.populationBackup.index;
            const evalBtn = document.getElementById(`btn-evaluate_${prevGenIndex}`);
            const evalArea = document.getElementById(`area-userEvaluate_${prevGenIndex}`);
            
            if(evalBtn) evalBtn.removeAttribute('disabled');
            if(evalArea) evalArea.removeAttribute('disabled');
            
            const msgEval = document.getElementById(`msg-userEvaluate_${prevGenIndex}`);
            if(msgEval) msgEval.style.display = 'none';

            // 5. ログに「戻った」ことを記録する
            window.experimentLogs.push(`--- [操作] 世代: ${prevGenIndex} に戻り、やり直しました ---`);
            recordEvent('undo', { g: prevGenIndex });

            // 履歴が空になったら戻るボタンを隠す
            if (window.generationHistory.length === 0) {
                undoBtn.style.display = 'none';
            }
        });
    }

    getTables().then(async (data) => {
        dics.color = data.colorDic;
        dics.textReplacementPairs = data.textReplacementPairs;
        dics.topic = data.topic2EvaluateItems;
        dics.topicKeys = Object.keys(dics.topic);
        dics.condition = data.conditionValues;
        dics.conditionKeys = Object.keys(dics.condition);
        console.log(dics);

        const elemMsg = document.getElementById('msg-ReadFiles');
        elemMsg.innerText = 'AIモデルを読み込み中...';
        await loadModel();

        await preloadDictVectors(dics.conditionKeys, (done, total) => {
            elemMsg.innerText = `辞書をベクトル化中... ${done} / ${total}`;
        });

        elemMsg.remove();

        main();
    });
});

// #MARK: F: main
function main() {
    if(isAvailableEstimation) {
        Estimation.enableEstimation();
    }

    // #MARK: | 最初のイメージ入力エリアを表示
    const elemMain = document.querySelector('main');
    const initialSection = document.createElement('section');
    initialSection.classList.add('genCycle');
    
    // ▼ ここから書き換え ▼
    initialSection.innerHTML = `
        <div class="userEvaluate">
            <div class="titleBar">
                <h3>最初のイメージを教えてください</h3>
                <img id="msg-initialEvaluate" class="msg-evaluate" src="assets/images/loading.svg" style="display:none">
                <span class="msg-loading" id="msg-loadKuromoji">必要なファイルを読み込んでいます...</span>
                <button id="btn-initialEvaluate" disabled>この内容で生成</button>
            </div>
            <div class="userEvaluate-inner" id="initialEvaluate-inner">
                <textarea id="area-initialEvaluate" rows="" placeholder="例：「青いストライプ柄が欲しい」「丸と三角を使ってほしい」など。空欄のまま決定すると完全ランダムで生成します。"></textarea>
                
                <!-- ★ 修正：柄のサンプル「画像」が見れるように復元・強化しました！ -->
                <details style="margin-top: 8px; font-size: 0.85em; color: #555; cursor: pointer;">
                    <summary style="outline: none; font-weight: bold;">💡 どんな「柄」や「形」が使えるか見る（画像あり）</summary>
                    <div style="padding: 10px; background: #fafafa; border-radius: 6px; border: 1px solid #ddd; margin-top: 5px; line-height: 1.6; cursor: text;">
                        <b style="color:#333;">🔺 使える「形」の例：</b><br>
                        丸(円)、三角、四角、楕円、星<br>
                        <hr style="border:none; border-top:1px dashed #ccc; margin: 6px 0;">
                        <b style="color:#333;">🔲 使える「柄・表現」の例：</b><br>
                        波、唐草模様、シャワー(散りばめ)、キラキラ、ふわふわ(雲)、ネオン(発光)、エモい、レトロ など<br>
                        
                        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; justify-content: center;">
                            <div style="width: 80px; text-align: center;">
                                <img src="./assets/images/pattern_stripe.png" alt="ストライプ" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: block;">
                                <p style="font-size: 10px; margin-top: 4px; line-height: 1.2;">ストライプ</p>
                            </div>
                            <div style="width: 80px; text-align: center;">
                                <img src="./assets/images/pattern_windowpane.png" alt="ウィンドウペーン" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: block;">
                                <p style="font-size: 10px; margin-top: 4px; line-height: 1.2;">ウィンドウ<br>ペーン</p>
                            </div>
                            <div style="width: 80px; text-align: center;">
                                <img src="./assets/images/pattern_dot.png" alt="ドット" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: block;">
                                <p style="font-size: 10px; margin-top: 4px; line-height: 1.2;">ドット</p>
                            </div>
                            <div style="width: 80px; text-align: center;">
                                <img src="./assets/images/pattern_showerdot.png" alt="シャワードット" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: block;">
                                <p style="font-size: 10px; margin-top: 4px; line-height: 1.2;">シャワードット</p>
                            </div>
                            <div style="width: 80px; text-align: center;">
                                <img src="./assets/images/pattern_gingham.png" alt="ギンガムチェック" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: block;">
                                <p style="font-size: 10px; margin-top: 4px; line-height: 1.2;">ギンガム<br>チェック</p>
                            </div>
                            <div style="width: 80px; text-align: center;">
                                <img src="./assets/images/pattern_houndstooth.png" alt="千鳥格子" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: block;">
                                <p style="font-size: 10px; margin-top: 4px; line-height: 1.2;">千鳥格子</p>
                            </div>
                            <div style="width: 80px; text-align: center;">
                                <img src="./assets/images/pattern_argyle.png" alt="アーガイル" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: block;">
                                <p style="font-size: 10px; margin-top: 4px; line-height: 1.2;">アーガイル</p>
                            </div>
                            <div style="width: 80px; text-align: center;">
                                <img src="./assets/images/pattern_tartan.png" alt="タータンチェック" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: block;">
                                <p style="font-size: 10px; margin-top: 4px; line-height: 1.2;">タータン<br>チェック</p>
                            </div>
                            <div style="width: 80px; text-align: center;">
                                <img src="./assets/images/pattern_madras.png" alt="マドラスチェック" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: block;">
                                <p style="font-size: 10px; margin-top: 4px; line-height: 1.2;">マドラス<br>チェック</p>
                            </div>
                            <div style="width: 80px; text-align: center;">
                                <img src="./assets/images/pattern_clusterstripe.png" alt="ラスターストライプ" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: block;">
                                <p style="font-size: 10px; margin-top: 4px; line-height: 1.2;">クラスター<br>ストライプ</p>
                            </div>
                            <div style="width: 80px; text-align: center;">
                                <img src="./assets/images/pattern_clubstripe.png" alt="クラブストライプ" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: block;">
                                <p style="font-size: 10px; margin-top: 4px; line-height: 1.2;">クラブ<br>ストライプ</p>
                            </div>
                            <div style="width: 80px; text-align: center;">
                                <img src="./assets/images/pattern_multistripe.png" alt="マルチストライプ" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: block;">
                                <p style="font-size: 10px; margin-top: 4px; line-height: 1.2;">マルチ<br>ストライプ</p>
                            </div>
                        </div>

                    </div>
                </details>

            </div>
        </div>`;
    // ▲ ここまで書き換え ▲
    elemMain.appendChild(initialSection);

    let kuromojiTokenizer;
    let isTokenizerReady = false;
    let elemMsgKuromoji = document.getElementById('msg-loadKuromoji');
    kuromoji.builder({dicPath: "./assets/dict/"}).build(function (err, tokenizer) {
        console.log("tokenizerBuild", "tokenizer is ready");
        kuromojiTokenizer = tokenizer;
        isTokenizerReady = true;
        elemMsgKuromoji.innerText = '準備完了';
        elemMsgKuromoji.classList.remove('msg-loading');
        document.getElementById('btn-initialEvaluate').removeAttribute('disabled');
        document.getElementById('area-initialEvaluate').focus();
    });

    const elemInitialBtn = document.getElementById('btn-initialEvaluate');
    const elemInitialTextarea = document.getElementById('area-initialEvaluate');
    const elemInitialMsg = document.getElementById('msg-initialEvaluate');

    elemInitialBtn.addEventListener('click', async () => {
        elemInitialTextarea.setAttribute('disabled', '');
        elemInitialBtn.setAttribute('disabled', '');
        elemInitialMsg.style.display = 'inline-block';

        const initialText = elemInitialTextarea.value;
        
        // ★ 初期入力のログを記録
        window.experimentLogs.push(`世代: 0 (初期入力), 評価文: ${initialText || "（空欄・完全ランダム）"}`);
        recordEvaluate(0, initialText || '');

        let analysis = null;
        if (initialText && initialText.trim()) {
            analysis = await analyzeInitialText(kuromojiTokenizer, initialText);
        }

        elemInitialMsg.style.display = 'none';
        elemInitialTextarea.removeAttribute('disabled');

        startGeneration(kuromojiTokenizer, initialText);
    });
}

// #MARK: F: startGeneration
async function startGeneration(kuromojiTokenizer, initialText) {
    appendGenCycle(1);
    document.getElementById(`msg-userEvaluate_1`).style.display = 'none';
    let elemFirstEvaluateBtn = document.getElementById('btn-evaluate_1');
    elemFirstEvaluateBtn.setAttribute('disabled', '');

    let initialChroms = Population.getInit();
    let population = {
        "index": 1,
        "bestChromId": 0,
        "pickupChromId": 1,
        "chroms": initialChroms
    };

    if (initialText && initialText.trim()) {
        await makeEvaluateRule(kuromojiTokenizer, initialText, population, 1.0);
        evaluateRules.length = 0;
        console.log('[Initial] makeEvaluateRule による初期集団の強制書き換えが完了しました');
    }

    window.currentPopulation = population; // 最終世代の記録用

    let firstGenDrawCount = 0;
    const elemMsgGenerating = document.getElementById(`msg-userEvaluate_1`);
    const intervalId = setInterval(() => {
        if(firstGenDrawCount < Population.POPULATION_SIZE) {
            const newCanvas = document.createElement("canvas");
            newCanvas.id = `cv_1_${firstGenDrawCount}`;
            newCanvas.setAttribute('width', 512);
            newCanvas.setAttribute('height', 384);
            drawCanvas(newCanvas, population.chroms[firstGenDrawCount]);
            let impression = getImpression(newCanvas, population.chroms[firstGenDrawCount]);
            if(impression.colors.length != 1) {
                if(
                    (firstGenDrawCount == population.bestChromId) ||
                    (firstGenDrawCount == population.pickupChromId)
                ) {
                    const isLeft = (firstGenDrawCount == population.bestChromId);
                    
                    // 第1世代のドロップ受け入れ設定（カメラ破棄の置換処理込み）
                    function attachDrop(canvasElem, isLeftNode) {
                        canvasElem.addEventListener('dragover', (e) => {
                            e.preventDefault();
                            canvasElem.style.boxShadow = isLeftNode ? "0 0 15px 5px #ff8c00" : "0 0 15px 5px #008cff";
                        });
                        // ★ 修正：ドラッグが乗っていない時も、ドラッグ中なら光らせたままにする
                        canvasElem.addEventListener('dragleave', () => {
                            canvasElem.style.boxShadow = window.isDragging ? (isLeftNode ? "0 0 0 8px rgba(255, 140, 0, 0.4)" : "0 0 0 8px rgba(0, 140, 255, 0.4)") : "none";
                        });
                        canvasElem.addEventListener('drop', (e) => {
                            e.preventDefault();
                            window.isDragging = false; // ★ ドラッグ終了
                            canvasElem.style.boxShadow = "none";

                            const draggedChromId = parseInt(e.dataTransfer.getData('text/plain'), 10);
                            if (!isNaN(draggedChromId)) {
                                if (isLeftNode) {
                                    population.bestChromId = draggedChromId;
                                } else {
                                    population.pickupChromId = draggedChromId;
                                }
                                
                                const freshCanvas = document.createElement("canvas");
                                freshCanvas.id = canvasElem.id;
                                freshCanvas.setAttribute('width', 512);
                                freshCanvas.setAttribute('height', 384);
                                canvasElem.replaceWith(freshCanvas);
                                
                                drawCanvas(freshCanvas, population.chroms[draggedChromId]);
                                setupCanvasCamera(freshCanvas, population.chroms[draggedChromId]);
                                attachDrop(freshCanvas, isLeftNode);
                                
                                // グリッドの選択状態を更新（もし表示されていれば）
                                if (window.updateGridSelection_1) window.updateGridSelection_1();
                            }
                        });
                    }
                    attachDrop(newCanvas, isLeft);

                    document.getElementById('compareImages_1').appendChild(newCanvas);
                    setupCanvasCamera(newCanvas, population.chroms[firstGenDrawCount]);
                }
                population.chroms[firstGenDrawCount]._impression = JSON.parse(JSON.stringify(impression));
                firstGenDrawCount++;
            } else {
                population.chroms[firstGenDrawCount] = Population.getRandomIndividual();
            }
        } else {
            clearInterval(intervalId);
            document.getElementById('area-userEvaluate_1').focus();
            enableEvaluateBtn(population, kuromojiTokenizer);
            console.log(`%cpopulation: `, `color: #f88`);
            console.log(JSON.parse(JSON.stringify(population)));
        }
    }, 5);
}

// #MARK: F: setupLockButtons
function setupLockButtons(population) {
    const genCount = population.index;

    const lockState = { L: { figure: false, color: false, pattern: false }, R: { figure: false, color: false, pattern: false } };

    // ★ 追加：ロックボタンの初期テキストを親切な名前に強制上書き
    ['L', 'R'].forEach(side => {
        const btnF = document.getElementById(`btn-lockFigure_${genCount}_${side}`);
        const btnP = document.getElementById(`btn-lockPattern_${genCount}_${side}`);
        if (btnF && !lockState[side].figure) btnF.textContent = '🔺 図形(丸･三角など)';
        if (btnP && !lockState[side].pattern) btnP.textContent = '🔲 模様(ドット･ストライプなど)';
    });

    function removeLockRules(type) {
        for (let i = evaluateRules.length - 1; i >= 0; i--) {
            if (type === 'figure'  && evaluateRules[i].lockedFigure  !== undefined) evaluateRules.splice(i, 1);
            if (type === 'color'   && evaluateRules[i].lockedColor   !== undefined) evaluateRules.splice(i, 1);
            if (type === 'pattern' && evaluateRules[i].lockedPattern !== undefined) evaluateRules.splice(i, 1);
            if (type === 'all') {
                if (
                    evaluateRules[i].lockedFigure  !== undefined ||
                    evaluateRules[i].lockedColor   !== undefined ||
                    evaluateRules[i].lockedPattern !== undefined
                ) evaluateRules.splice(i, 1);
            }
        }
    }

    ['L', 'R'].forEach(side => {
        const sideLabel = side === 'L' ? '左' : '右';

        const btnFigure  = document.getElementById(`btn-lockFigure_${genCount}_${side}`);
        const btnColor   = document.getElementById(`btn-lockColor_${genCount}_${side}`);
        const btnPattern = document.getElementById(`btn-lockPattern_${genCount}_${side}`);
        const btnAll     = document.getElementById(`btn-lockAll_${genCount}_${side}`);

        function updateButtonStyles() {
            btnFigure.classList.toggle('btn-lock--active', lockState[side].figure);
            btnColor.classList.toggle('btn-lock--active', lockState[side].color);
            btnPattern.classList.toggle('btn-lock--active', lockState[side].pattern);
        }

        btnFigure.addEventListener('click', () => {
            lockState[side].figure = !lockState[side].figure;
            removeLockRules('figure');
            if (lockState[side].figure) {
                // クリックされた時点の最新の親を取得
                const currentChrom = side === 'L' ? population.chroms[population.bestChromId] : population.chroms[population.pickupChromId];
                const fig = currentChrom.fg_type;
                evaluateRules.push({ weight: 0, severity: 0, target: {}, lockedFigure: fig, lockedPattern: currentChrom.fg_pattern });
                console.log(`[Lock] ${sideLabel}の形を固定: ${fig}`);
                btnFigure.textContent = `🔒 図形 (${fig})`; // ★ 修正
            } else {
                btnFigure.textContent = '🔺 図形(丸･三角など)'; // ★ 修正
            }
            updateButtonStyles();
        });

        btnColor.addEventListener('click', () => {
            lockState[side].color = !lockState[side].color;
            removeLockRules('color');
            if (lockState[side].color) {
                const currentChrom = side === 'L' ? population.chroms[population.bestChromId] : population.chroms[population.pickupChromId];
                const h = Number(currentChrom.bgColor_hue);
                const s = Number(currentChrom.bgColor_saturation);
                const l = Number(currentChrom.bgColor_lightness);
                evaluateRules.push({ weight: 0, severity: 0, target: {}, lockedColor: { h, s, l } });
                console.log(`[Lock] ${sideLabel}の色を固定: H:${h}`);
                btnColor.textContent = `🔒 色`;
            } else {
                btnColor.textContent = '🎨 色';
            }
            updateButtonStyles();
        });

        btnPattern.addEventListener('click', () => {
            lockState[side].pattern = !lockState[side].pattern;
            removeLockRules('pattern');
            if (lockState[side].pattern) {
                const currentChrom = side === 'L' ? population.chroms[population.bestChromId] : population.chroms[population.pickupChromId];
                const pat = currentChrom.fg_pattern;
                evaluateRules.push({ weight: 0, severity: 0, target: {}, lockedPattern: pat });
                console.log(`[Lock] ${sideLabel}の柄を固定: ${pat}`);
                btnPattern.textContent = `🔒 模様 (${pat})`; // ★ 修正
            } else {
                btnPattern.textContent = '🔲 模様(ドット･ストライプなど)'; // ★ 修正
            }
            updateButtonStyles();
        });

        btnAll.addEventListener('click', () => {
            lockState[side].figure = true;
            lockState[side].color  = true;
            lockState[side].pattern = true;
            removeLockRules('all');
            
            const currentChrom = side === 'L' ? population.chroms[population.bestChromId] : population.chroms[population.pickupChromId];
            const fig = currentChrom.fg_type;
            const pat = currentChrom.fg_pattern;
            const h = Number(currentChrom.bgColor_hue);
            const s = Number(currentChrom.bgColor_saturation);
            const l = Number(currentChrom.bgColor_lightness);
            
            evaluateRules.push({ weight: 0, severity: 0, target: {}, lockedFigure: fig, lockedPattern: pat });
            evaluateRules.push({ weight: 0, severity: 0, target: {}, lockedColor: { h, s, l } });
            console.log(`[Lock] ${sideLabel}の全てを固定`);
            btnFigure.textContent  = `🔒 図形 (${fig})`; // ★ 修正
            btnColor.textContent   = `🔒 色`;
            btnPattern.textContent = `🔒 模様 (${pat})`; // ★ 修正
            updateButtonStyles();
        });
    });

    // 解除ボタン（左右共通）
    const btnRelease = document.getElementById(`btn-lockRelease_${genCount}`);
    btnRelease.addEventListener('click', () => {
        ['L', 'R'].forEach(side => {
            lockState[side].figure  = false;
            lockState[side].color   = false;
            lockState[side].pattern = false;
            const s = side;
            const btnF = document.getElementById(`btn-lockFigure_${genCount}_${s}`);
            const btnC = document.getElementById(`btn-lockColor_${genCount}_${s}`);
            const btnP = document.getElementById(`btn-lockPattern_${genCount}_${s}`);
            if (btnF) { btnF.textContent = '🔺 図形(丸･三角など)'; btnF.classList.remove('btn-lock--active'); } // ★ 修正
            if (btnC) { btnC.textContent = '🎨 色'; btnC.classList.remove('btn-lock--active'); }
            if (btnP) { btnP.textContent = '🔲 模様(ドット･ストライプなど)'; btnP.classList.remove('btn-lock--active'); } // ★ 修正
        });
        removeLockRules('all');
        console.log('[Lock] 全ての固定を解除');
    });
}

function enableEvaluateBtn(population, kuromojiTokenizer) {
    let elemEvaluateBtn = document.getElementById(`btn-evaluate_${population.index}`);
    let elemMsgEvaluate = document.getElementById(`msg-userEvaluate_${population.index}`);
    elemEvaluateBtn.removeAttribute('disabled');
    setupLockButtons(population);

    elemEvaluateBtn.addEventListener('click', () => {
        // ★ 戻る機能のために、現在の状態のバックアップと参照をセットで保存する
        window.generationHistory.push({
            populationBackup: JSON.parse(JSON.stringify(population)),
            populationRef: population,
            evaluateRulesBackup: JSON.parse(JSON.stringify(evaluateRules))
        });
        // 戻るボタンを表示する
        document.getElementById('btn-undo').style.display = 'inline-block';

        // #MARK: 評価
        let elemAreaUserEvaluate = document.getElementById(`area-userEvaluate_${population.index}`);
        let evaluateText = elemAreaUserEvaluate.value;

        // ★ 各世代の評価文をログに記録
        window.experimentLogs.push(`世代: ${population.index}, 評価文: ${evaluateText || "（空欄）"}`);
        // 評価した時点の左右の個体(ドラッグで差し替えた後のもの)・カメラ・ロック状態を記録
        recordShownPair(population, population.index, { locks: getActiveLocks() });
        recordEvaluate(population.index, evaluateText);

        elemAreaUserEvaluate.setAttribute('disabled', '');
        elemMsgEvaluate.style.display = 'inline-block';
        elemEvaluateBtn.setAttribute('disabled', '');
        
        let currentZoom = 1.0;
        const bestCanvas = document.getElementById(`cv_${population.index}_0`);
        if (bestCanvas && bestCanvas.__cameraState) {
            currentZoom = bestCanvas.__cameraState.zoom;
        }

        setTimeout(async () => {
            await makeEvaluateRule(kuromojiTokenizer, evaluateText, population, currentZoom); 
            population.chroms.forEach((chrom, i) => {
                setFitnessScore(chrom);
            });
            
            // 次の世代の生成
            const nextPopulation = Population.crossover(population, evaluateRules);
            appendGenCycle(nextPopulation.index);

            for(let i = 0; i < nextPopulation.chroms.length; i++) {
                const newCanvas = document.createElement("canvas");
                newCanvas.id = `cv_${nextPopulation.index}_${i}`;
                newCanvas.setAttribute('width', 512);
                newCanvas.setAttribute('height', 384);
                drawCanvas(newCanvas, nextPopulation.chroms[i]);
                let impression = getImpression(newCanvas, nextPopulation.chroms[i]);
                nextPopulation.chroms[i]._impression = JSON.parse(JSON.stringify(impression));
                
                setFitnessScore(nextPopulation.chroms[i]);
                
                if (nextPopulation.chroms[i]._impression.colors && nextPopulation.chroms[i]._impression.colors.length <= 1) {
                    nextPopulation.chroms[i]._fitness -= 10000;
                }
            }

            nextPopulation.chroms.sort((a, b) => b._fitness - a._fitness);
            nextPopulation.bestChromId = 0;
            
            if (nextPopulation.chroms[0]._impression && nextPopulation.chroms[0]._impression['情報']) {
                    console.log(`========== 世代 ${nextPopulation.index} : ベスト個体の評価ログ ==========`);
                    console.log(nextPopulation.chroms[0]._impression['情報'].join('\n'));
                    console.log(` ★ 最終適応度(Fitness): ${nextPopulation.chroms[0]._fitness.toFixed(2)}`);
            }

            let minDist = 0.5;
            const bestChrom = nextPopulation.chroms[nextPopulation.bestChromId];
            const genParamKeys = Object.keys(Population.PARAMS);
            nextPopulation.pickupChromId = nextPopulation.chroms.length - 1;
            for(let i = nextPopulation.chroms.length - 1; i > 0; i--) {
                if(i != nextPopulation.bestChromId) {
                    const checkChrom = nextPopulation.chroms[i];
                    let dist2BestChrom = 0;
                    for(let j = 0; j < genParamKeys.length; j++) {
                        let paramKeyName = genParamKeys[j];
                        let bestChromValue = fixChromString(bestChrom[paramKeyName]);
                        let checkChromValue = fixChromString(checkChrom[paramKeyName]);
                        let range = Population.PARAMS[paramKeyName][1] - Population.PARAMS[paramKeyName][0];
                        dist2BestChrom += Math.abs(bestChromValue - checkChromValue) / range;
                    }
                    if(
                        (dist2BestChrom > minDist) &&
                        (checkChrom._impression.colors.length > 1)
                    ) {
                        nextPopulation.pickupChromId = i;
                    }
                }
            }

            [nextPopulation.bestChromId, nextPopulation.pickupChromId].forEach((chromId, i) => {
                const newCanvas = document.createElement("canvas");
                newCanvas.id = `cv_${nextPopulation.index}_${i}`;
                newCanvas.setAttribute('width', 512);
                newCanvas.setAttribute('height', 384);
                drawCanvas(newCanvas, nextPopulation.chroms[chromId]);

                // 第2世代以降のドロップ受け入れ設定（カメラ破棄の置換処理込み）
                function attachDrop2(canvasElem, isLeftNode) {
                    canvasElem.addEventListener('dragover', (e) => {
                        e.preventDefault(); 
                        canvasElem.style.boxShadow = isLeftNode ? "0 0 15px 5px #ff8c00" : "0 0 15px 5px #008cff";
                    });
                    // ★ 修正：ドラッグが乗っていない時も光らせておく
                    canvasElem.addEventListener('dragleave', () => { 
                        canvasElem.style.boxShadow = window.isDragging ? (isLeftNode ? "0 0 0 8px rgba(255, 140, 0, 0.4)" : "0 0 0 8px rgba(0, 140, 255, 0.4)") : "none";
                    });
                    canvasElem.addEventListener('drop', (e) => {
                        e.preventDefault();
                        window.isDragging = false; // ★ ドラッグ終了
                        canvasElem.style.boxShadow = "none";
                        const draggedChromId = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        if (!isNaN(draggedChromId)) {
                            if (isLeftNode) {
                                nextPopulation.bestChromId = draggedChromId;
                            } else {
                                nextPopulation.pickupChromId = draggedChromId;
                            }
                            
                            const freshCanvas = document.createElement("canvas");
                            freshCanvas.id = canvasElem.id;
                            freshCanvas.setAttribute('width', 512);
                            freshCanvas.setAttribute('height', 384);
                            canvasElem.replaceWith(freshCanvas);
                            
                            drawCanvas(freshCanvas, nextPopulation.chroms[draggedChromId]);
                            setupCanvasCamera(freshCanvas, nextPopulation.chroms[draggedChromId]);
                            attachDrop2(freshCanvas, isLeftNode);

                            // グリッドの選択状態を更新（もし表示されていれば）
                            if (window[`updateGridSelection_${nextPopulation.index}`]) {
                                window[`updateGridSelection_${nextPopulation.index}`]();
                            }
                        }
                    });
                }
                attachDrop2(newCanvas, i === 0);

                document.getElementById(`compareImages_${nextPopulation.index}`).appendChild(newCanvas);
                setupCanvasCamera(newCanvas, nextPopulation.chroms[chromId]);
            });

            enableEvaluateBtn(nextPopulation, kuromojiTokenizer);
            elemMsgEvaluate.style.display = 'none';

            setTimeout(() => {
                let elemMain = document.querySelector('main');
                elemMain.scrollTo(0, elemMain.scrollHeight);
            }, 200);

        }, 50);
    });

    // ==========================================
    // 全個体を表示するボタンとエリアの動的生成
    // ==========================================
    let elemCompareImages = document.getElementById(`compareImages_${population.index}`);
    
    if (elemCompareImages && !document.getElementById(`btn-showall_${population.index}`)) {
        let btnShowAll = document.createElement('button');
        btnShowAll.id = `btn-showall_${population.index}`;
        btnShowAll.textContent = "全20個体を表示 🔽";
        btnShowAll.classList.add('btn-showall');
        btnShowAll.style.cssText = "display: block; margin: 10px auto; padding: 5px 15px; cursor: pointer; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 4px;";

        let showallArea = document.createElement('div');
        showallArea.id = `showall-area_${population.index}`;
        showallArea.style.display = 'none';

        // グリッドのコンテナ設定
        let showallGrid = document.createElement('div');
        showallGrid.style.display = 'flex';
        showallGrid.style.flexWrap = 'wrap';
        showallGrid.style.justifyContent = 'center';
        showallGrid.style.gap = '10px';
        showallGrid.style.marginTop = '15px';
        showallArea.appendChild(showallGrid);

        const canvasWrappers = [];

        // 外部から（ドロップ時に）見た目を更新できるように関数をウィンドウに登録
        window[`updateGridSelection_${population.index}`] = function() {
            canvasWrappers.forEach(w => {
                const idx = Number(w.dataset.index);
                w.style.border = "2px solid transparent";
                w.style.backgroundColor = "transparent";
                if (idx === population.bestChromId) {
                    w.style.border = "2px solid #ff8c00";
                    w.style.backgroundColor = "#fff3e0";
                } else if (idx === population.pickupChromId) {
                    w.style.border = "2px solid #008cff";
                    w.style.backgroundColor = "#e3f2fd";
                }
            });
        };

        // グリッドに20個体を追加
        for(let i = 0; i < population.chroms.length; i++) {
            const wrapper = document.createElement('div');
            wrapper.dataset.index = i;
            // ★固定幅を指定してレイアウトが潰れるのを完全に防ぐ
            wrapper.style.width = '140px'; 
            wrapper.style.padding = '8px';
            wrapper.style.borderRadius = '8px';
            wrapper.style.textAlign = 'center';
            wrapper.style.transition = 'all 0.2s';
            wrapper.style.border = "2px solid transparent";
            wrapper.style.boxSizing = "border-box";
            
            // ドラッグ元（つかめるアイテム）としての設定
            wrapper.draggable = true;
            wrapper.style.cursor = "grab";
            wrapper.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', i.toString());
                e.dataTransfer.effectAllowed = "copy";
                
                // ★ 画像をつかんだ瞬間、親画像（ドロップ先）を光らせてアピールする
                window.isDragging = true;
                const leftCanvas = document.getElementById(`cv_${population.index}_0`);
                const rightCanvas = document.getElementById(`cv_${population.index}_1`);
                if(leftCanvas) {
                    leftCanvas.style.transition = "box-shadow 0.2s ease";
                    leftCanvas.style.boxShadow = "0 0 0 8px rgba(255, 140, 0, 0.5)";
                }
                if(rightCanvas) {
                    rightCanvas.style.transition = "box-shadow 0.2s ease";
                    rightCanvas.style.boxShadow = "0 0 0 8px rgba(0, 140, 255, 0.5)";
                }
            });

            // ★ 画像を離した瞬間、光を消す
            wrapper.addEventListener('dragend', (e) => {
                window.isDragging = false;
                const leftCanvas = document.getElementById(`cv_${population.index}_0`);
                const rightCanvas = document.getElementById(`cv_${population.index}_1`);
                if(leftCanvas) leftCanvas.style.boxShadow = "none";
                if(rightCanvas) rightCanvas.style.boxShadow = "none";
            });

            const newCanvas = document.createElement("canvas");
            newCanvas.id = `cv_all_${population.index}_${i}`;
            // ★内部解像度は描画が崩れないよう本来の512x384に戻す
            newCanvas.setAttribute('width', 512); 
            newCanvas.setAttribute('height', 384);
            // ★CSSで表示サイズをラッパーの幅（100%）に縮小する
            newCanvas.style.width = "100%"; 
            newCanvas.style.height = "auto";
            newCanvas.style.borderRadius = "4px";
            newCanvas.style.pointerEvents = "none"; // ドラッグ時の誤作動防止
            
            drawCanvas(newCanvas, population.chroms[i]);
            setupCanvasCamera(newCanvas, population.chroms[i]); // スケール調整を適用
            
            const label = document.createElement('div');
            label.textContent = `#${i}`;
            label.style.fontSize = '14px';
            label.style.fontWeight = 'bold';
            label.style.marginTop = '6px';

            wrapper.appendChild(newCanvas);
            wrapper.appendChild(label);
            showallGrid.appendChild(wrapper);
            canvasWrappers.push(wrapper);
        }

        window[`updateGridSelection_${population.index}`]();

        btnShowAll.addEventListener('click', () => {
            const isHidden = showallArea.style.display === 'none';
            showallArea.style.display = isHidden ? 'block' : 'none';
            btnShowAll.textContent = isHidden ? "全個体を隠す 🔼" : "全20個体を表示 🔽";
        });

        elemCompareImages.after(btnShowAll);
        btnShowAll.after(showallArea);
    }
}

// ★ 修正：すべての追加した柄のIDを網羅
// ★ 修正：末尾に 17, 18, 19 を追加！
const patternNumMap = {
    'none':0, 'dot':1, 'stripe':2, 'checker':3, 'gingham':4, 'tartan':5, 
    'buffalo':6, 'houndstooth':7, 'windowpane':8, 'argyle':9, 'madras':10, 'cloud':11, 'neon':12,
    'wave': 13, 'showerdot': 14, 'kirakira': 15, 'karakusa': 16,
    'clusterstripe': 17, 'clubstripe': 18, 'multistripe': 19 // ★追加
};

function fixChromString(value) {
    if (patternNumMap[value] !== undefined) return patternNumMap[value];
    if (value === 'circle') return 0;
    if (value === 'ellipse') return 0.5;
    if ((value === 'linear') || (value === 'radial') || (value === 'square')) return 2;
    if ((value === 'triangle') || (value === 'conic')) return 3;
    if (value === 'star') return 4; 
    return Number(value) || 0; 
}

// ==========================================
// 評価実験用: 履歴の記録(送信は _estimation.js が行う)
// ==========================================
function getCamera(genIndex, side) {
    const cv = document.getElementById(`cv_${genIndex}_${side}`);
    const c = cv && cv.__cameraState;
    return c ? { x: Math.round(c.x), y: Math.round(c.y), zoom: Number(c.zoom.toFixed(3)), rotation: Number((c.rotation || 0).toFixed(3)) } : null;
}

function getActiveLocks() {
    return evaluateRules
        .filter(r => r.lockedFigure !== undefined || r.lockedColor !== undefined || r.lockedPattern !== undefined)
        .map(r => ({ fig: r.lockedFigure, pat: r.lockedPattern, col: r.lockedColor }));
}

// 左(best)・右(pickup)の2枚を履歴に記録。extra は左の1枚目にだけ付ける
function recordShownPair(population, genIndex, extra = {}) {
    [['best', population.bestChromId, 0], ['pickup', population.pickupChromId, 1]].forEach(([role, id, side]) => {
        const chrom = population.chroms[id];
        if (!chrom) return;
        recordShown(genIndex, role, chrom, Object.assign({ cam: getCamera(genIndex, side) }, side === 0 ? extra : {}));
    });
}

// 送信時に呼ばれる: 評価していない最終世代の2枚を記録する
const recordedFinal = new Set();
window.recordFinalShown = function () {
    const p = window.currentPopulation;
    if (!p) return;
    const key = `${p.index}:${p.bestChromId}:${p.pickupChromId}`;
    if (recordedFinal.has(key)) return;
    recordedFinal.add(key);
    recordShownPair(p, p.index, { final: true });
};