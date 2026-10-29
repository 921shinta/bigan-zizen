import { dics, evaluateRules } from "./main.js";
import { getSimilarWords } from "./_similarity.js";

const DEBUG_MER = 1;
const DEBUG_MER_2 = 1;
const DEBUG_MER_1 = 1;
const DEBUG_MER_3 = 1;
const DEBUG_MER_4 = 1;
const DEBUG_MER_5 = 1;
const DEBUG_MER_6 = 1;
const DEBUG_SFS = 1;
const DEBUG_MDB = 1;
const DEBUG_GCV = 0;
const RULE_WEIGHT_DECAY = 0.631;

// ==========================================
// 辞書を「輪郭(Figure)」と「柄(Pattern)」に完全分離
// ==========================================
const figureTypeDict = {
    '丸': 'circle', '円': 'circle', '丸い': 'circle', '円形': 'circle',
    '三角': 'triangle', '三角形': 'triangle',
    '四角': 'square', '四角形': 'square', '正方形': 'square', '矩形': 'square',
    '楕円': 'ellipse', '楕円形': 'ellipse',
    '星': 'star', '星型': 'star', 'スター': 'star'
};

const patternTypeDict = {
    'ドット': 'dot', '水玉': 'dot', 'ドット柄': 'dot',
    'シャワー': 'showerdot', 'シャワードット': 'showerdot', '散りばめ': 'showerdot',
    'ストライプ': 'stripe', '縞': 'stripe', '縦縞': 'stripe', 'ストライプ柄': 'stripe', '横縞': 'stripe',
    'クラスター': 'clusterstripe', 'クラスターストライプ': 'clusterstripe', // ★追加
    'クラブ': 'clubstripe', 'クラブストライプ': 'clubstripe', 'レジメンタル': 'clubstripe', // ★追加
    'マルチ': 'multistripe', 'マルチストライプ': 'multistripe', // ★追加
    'チェック': 'checker', '格子': 'checker', '市松': 'checker', 'チェック柄': 'checker',
    'ギンガム': 'gingham', 'ギンガムチェック': 'gingham',
    'タータン': 'tartan', 'タータンチェック': 'tartan',
    'バッファロー': 'buffalo', 'バッファローチェック': 'buffalo',
    'ハウンドトゥース': 'houndstooth', '千鳥': 'houndstooth', '千鳥格子': 'houndstooth',
    'ウィンドウペーン': 'windowpane', '窓格子': 'windowpane',
    'アーガイル': 'argyle', 'ひし形': 'argyle',
    'マドラス': 'madras', 'マドラスチェック': 'madras',
    'ふわふわ': 'cloud', 'もこもこ': 'cloud', '雲': 'cloud', 'ふわ': 'cloud',
    'ネオン': 'neon', 'ネオンっぽい': 'neon', '発光': 'neon', '光る': 'neon', 'グロー': 'neon',
    '波': 'wave', '波模様': 'wave', 'ウェーブ': 'wave',
    'キラキラ': 'kirakira', 'ゆめかわ': 'kirakira', 'マーブル': 'kirakira', '幻想的': 'kirakira','かわいい': 'kirakira', 
    '無地': 'none', '柄なし': 'none', 'シンプル': 'none'
};

const adjustSeverityTable = [
    ["まったく", 0.5],
    ["少し", 0.8],
    ["若干", 0.8],
    ["ちょっと", 0.8],
    ["あまり", 0.8],
    ["やや", 1.5],
    ["かなり", 2],
    ["とても", 2.5],
    ["すごく", 2.5],
    ["もっと", 2.0],
    ["もう少し", 1.5],
    ["すぎる", 2.5]
];

const densityDict = {
    '細かい': { GFZ: -0.2, GRC: 0.2, GFX: -0.15 },
    '細かく': { GFZ: -0.2, GRC: 0.2, GFX: -0.15 },
    '小さい': { GFZ: -0.2, GRC: 0.2, GFX: -0.15 },
    '小さく': { GFZ: -0.2, GRC: 0.2, GFX: -0.15 },
    '密度':   { GFZ: -0.2, GRC: 0.2, GFX: -0.15 },
    '密':     { GFZ: -0.2, GRC: 0.2, GFX: -0.15 },
    '引き':   { GFZ: -0.2, GRC: 0.2, GFX: -0.20 },
    '引いて': { GFZ: -0.2, GRC: 0.2, GFX: -0.20 },
    '遠ざかる': { GFZ: -0.2, GRC: 0.2, GFX: -0.20 },
    '遠く':   { GFZ: -0.2, GRC: 0.2, GFX: -0.20 },
    '縮小':   { GFZ: -0.2, GRC: 0.2, GFX: -0.20 },
    '粗い':   { GFZ: 0.2, GRC: -0.2, GFX: 0.20 },
    '粗く':   { GFZ: 0.2, GRC: -0.2, GFX: 0.20 },
    '荒い':   { GFZ: 0.2, GRC: -0.2, GFX: 0.20 },
    '荒く':   { GFZ: 0.2, GRC: -0.2, GFX: 0.20 },
    '大きい': { GFZ: 0.2, GRC: -0.2, GFX: 0.20 },
    '大きく': { GFZ: 0.2, GRC: -0.2, GFX: 0.20 },
    '近づく': { GFZ: 0.2, GRC: -0.2, GFX: 0.20 },
    '近く':   { GFZ: 0.2, GRC: -0.2, GFX: 0.20 },
    '近づい': { GFZ: 0.2, GRC: -0.2, GFX: 0.20 },
    '拡大':   { GFZ: 0.2, GRC: -0.2, GFX: 0.20 },
    'ズーム':  { GFZ: 0.2, GRC: -0.2, GFX: 0.20 },
};

const thicknessDict = {
    '細い':   { GFY: -0.4, GSW: -0.4 },
    '細く':   { GFY: -0.4, GSW: -0.4 },
    '細め':   { GFY: -0.2, GSW: -0.2 },
    '太い':   { GFY: 0.4, GSW: 0.4 },
    '太く':   { GFY: 0.4, GSW: 0.4 },
    '太め':   { GFY: 0.2, GSW: 0.2 },
};

const emoDict = {
    'エモく': { GFS: -0.3, GBS: -0.3, GFL: -0.1, GBL: -0.1, GFA: -0.2 },
    'エモい': { GFS: -0.3, GBS: -0.3, GFL: -0.1, GBL: -0.1, GFA: -0.2 },
    'エモ':   { GFS: -0.3, GBS: -0.3, GFL: -0.1, GBL: -0.1, GFA: -0.2 },
    'ノスタルジック': { GFS: -0.4, GBS: -0.4, GFL: -0.15, GBL: -0.15, GFA: -0.2 },
    'レトロ': { GFS: -0.3, GBS: -0.3, GFL: -0.05, GBL: -0.05 },
    'かわいい': { GFL: 0.3, GBL: 0.3, GFS: 0.1, GBS: 0.1 },
    'かわいく': { GFL: 0.3, GBL: 0.3, GFS: 0.1, GBS: 0.1 },
    'カワイイ': { GFL: 0.3, GBL: 0.3, GFS: 0.1, GBS: 0.1 },
    '可愛い':   { GFL: 0.3, GBL: 0.3, GFS: 0.1, GBS: 0.1 },
    '可愛く':   { GFL: 0.3, GBL: 0.3, GFS: 0.1, GBS: 0.1 },
    'キュート': { GFL: 0.3, GBL: 0.3, GFS: 0.1, GBS: 0.1 },
    'ゆめかわ': { GFL: 0.4, GBL: 0.4, GFS: 0.1, GBS: 0.1 },
    'ポップ':   { GFL: 0.1, GBL: 0.1, GFS: 0.3, GBS: 0.3 },
    'かっこいい': { GFL: -0.2, GBL: -0.2, GFS: 0.1, GBS: 0.1 },
    'かっこよく': { GFL: -0.2, GBL: -0.2, GFS: 0.1, GBS: 0.1 },
    'カッコイイ': { GFL: -0.2, GBL: -0.2, GFS: 0.1, GBS: 0.1 },
    'クール':     { GFL: -0.2, GBL: -0.2, GFS: -0.1, GBS: -0.1 },
    'きれい':     { GFL: 0.1, GBL: 0.1, GFS: -0.1, GBS: -0.1 },
    '綺麗':       { GFL: 0.1, GBL: 0.1, GFS: -0.1, GBS: -0.1 }
};

// ==========================================
// 代表色（類似度計算の対象になる色はこれだけ）
// ==========================================
const repColors = {
    '赤': [0, 100, 50],
    '青': [240, 100, 50],
    '緑': [120, 100, 50],
    '黄': [60, 100, 50],
    '紫': [300, 100, 50],
    'ピンク': [330, 100, 80],
    '白': [0, 0, 100],
    '黒': [0, 0, 0],
    'グレー': [0, 0, 50],
    '茶色': [30, 100, 30],
    'オレンジ': [30, 100, 50],
    '水色': [180, 100, 50]
};

const repColorConditions = {};
for (const [name, hsl] of Object.entries(repColors)) {
    let h = hueToDictScale(hsl[0]);
    let s = hsl[1] / 50 - 1;
    let l = hsl[2] / 50 - 1;
    repColorConditions[name] = {
        GBH: h, GFH: h, GRH: h, GSH: h,
        GBS: s, GFS: s, GRS: s, GSS: s,
        GBL: l, GFL: l, GRL: l, GSL: l
    };
}

function hueToDictScale(hueDeg) {
    return (hueDeg + 180) / 180 % 2 - 1;
}

// 英語を完全に排除し、カタカナでプレースホルダーを生成するための配列
const KANA_MAP = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";

// ==========================================
// 完全一致キーワード（dics.color は「一致判定」専用）
// ==========================================
let EXACT_KEYWORDS = null;
function getExactKeywords() {
    if (EXACT_KEYWORDS) return EXACT_KEYWORDS;
    let kws = [];
    kws.push(...Object.keys(figureTypeDict), ...Object.keys(patternTypeDict));
    kws.push(...Object.keys(densityDict), ...Object.keys(thicknessDict), ...Object.keys(emoDict));
    adjustSeverityTable.forEach(p => kws.push(p[0]));
    if (dics.conditionKeys) kws.push(...dics.conditionKeys);
    if (dics.color) {
        dics.color.forEach(c => {
            kws.push(...c.name);
        });
    }

    kws.sort((a, b) => b.length - a.length);
    EXACT_KEYWORDS = [...new Set(kws)];
    return EXACT_KEYWORDS;
}

// ==========================================
// 類似度計算（対象は 条件キー + 代表色 のみ。dics.color は入れない）
// ==========================================
let SIM_TARGET_KEYS = null;
export function getSimilarityTargetKeys() {
    if (SIM_TARGET_KEYS) return SIM_TARGET_KEYS;
    const keys = (dics.conditionKeys || []).filter(key => {
        const cond = dics.condition[key];
        if (!cond) return false;
        const ks = Object.keys(cond);
        return !(ks.length === 1 && ks[0] === 'FGD');
    });
    keys.push(...Object.keys(repColorConditions)); // 代表色のみ
    SIM_TARGET_KEYS = [...new Set(keys)];
    return SIM_TARGET_KEYS;
}

const simCache = new Map();
function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
    ]);
}
async function safeSimilar(phrase) {
    if (simCache.has(phrase)) return simCache.get(phrase);
    let result = [];
    try {
        result = await withTimeout(
            getSimilarWords(phrase, getSimilarityTargetKeys(), 5, 0.5), 3000);
    } catch (e) {
        console.warn(`[similarity] "${phrase}" スキップ:`, e.message);
    }
    simCache.set(phrase, result);
    return result;
}

function protectExactMatches(text, keywords) {
    let tempText = text;
    let protectedWords = [];
    for (let kw of keywords) {
        if (kw.length >= 2 && tempText.includes(kw)) {
            let placeholder = "ホゴワード" + KANA_MAP[protectedWords.length % KANA_MAP.length];
            protectedWords.push({ placeholder, keyword: kw });
            // 確実に単語境界を作るため、前後に「読点（、）」を挟む
            tempText = tempText.split(kw).join(`、${placeholder}、`);
        }
    }
    return { tempText, protectedWords };
}

function restoreProtectedTokens(tokens, protectedWords) {
    tokens.forEach(t => {
        protectedWords.forEach(pm => {
            if (t.surface_form.includes(pm.placeholder)) {
                t.surface_form = t.surface_form.split(pm.placeholder).join(pm.keyword);
                t.basic_form = pm.keyword;
                t.pos = '名詞';
            }
        });
    });
    return tokens;
}

export async function analyzeInitialText(tokenizer, originalText) {
    let result = {
        colors: [],
        figures: [],
        patterns: [],
        conditions: {}
    };

    if (!originalText || !originalText.trim()) {
        return result;
    }

    let modifiedText = originalText;
    dics.textReplacementPairs.forEach(pair => {
        modifiedText = modifiedText.replaceAll(pair[0], pair[1]);
    });

    const textArray = modifiedText.split(/[．。()（）\n]\s*/);

    for (let i = 0; i < textArray.length; i++) {
        const singleText = textArray[i];
        if (!singleText) continue;

        const { tempText, protectedWords } = protectExactMatches(singleText, getExactKeywords());
        const rawTokens = tokenizer.tokenize(tempText);
        const tokens = restoreProtectedTokens(rawTokens, protectedWords);

        for (let j = 0; j < tokens.length - 1; j++) {
            const token = tokens[j];
            const nextToken = tokens[j + 1];
            if (!nextToken) break;

            if ((token.pos == '名詞') && (nextToken.pos == '名詞')) {
                const currentWord = token.basic_form === '*' ? token.surface_form : token.basic_form;
                const currentMatch = await matchDatabase(currentWord, false);
                if (!currentMatch.found) {
                    tokens.splice(j, 2, compoundTokens(token, nextToken, '名詞', '複合'));
                    j--; continue;
                }
            }
            if ((nextToken.pos == '助詞') || (nextToken.pos == '助動詞')) {
                tokens.splice(j, 2, compoundTokens(token, nextToken));
                j--; continue;
            }
        }

        const skipPosInit = new Set(['助詞', '助動詞', '記号']);
        const skipBasicFormsInit = new Set([
            '画像', '生成', '作成', 'する', 'して', 'した', 'なる', 'なっ', 'ある', 'いる',
            'もらう', 'くれる', 'あげる', 'ほしい', 'たい', 'くださる', 'もらえる',
            'どちら', 'どちらも', 'どっち', 'どれ', 'これ', 'それ', 'あれ',
            'っぽい', 'みたい', 'みたいだ', 'ようだ', 'ような', 'そう',
            '使う', '使って', '使った', 'つかう', 'つかって', '的', 'くして', 'く',
            '反転', '反対', '補色', '逆', '入れ替え', '交換', '入れ替えて'
        ]);

        for (let j = 0; j < tokens.length; j++) {
            if (skipPosInit.has(tokens[j].pos)) continue;
            if (skipBasicFormsInit.has(tokens[j].basic_form)) continue;
            if (skipBasicFormsInit.has(tokens[j].surface_form)) continue;

            const searchWord = (tokens[j].basic_form === '*') ? tokens[j].surface_form : tokens[j].basic_form;
            const match = await matchDatabase(searchWord, true);

            if (match.colorLocked && match.detectedHue !== null) {
                const h = match.detectedHue;
                const s = match.detectedSaturation;
                const l = match.detectedLightness;
                const exists = result.colors.some(c => {
                    let hueMatch = Math.abs(c.h - h) < 15 || ((h > 345 || h < 15) && (c.h > 345 || c.h < 15));
                    return hueMatch && Math.abs(c.s - s) < 20 && Math.abs(c.l - l) < 20;
                });
                if (!exists && result.colors.length < 3) {
                    result.colors.push({ h, s, l, name: tokens[j].surface_form });
                }
            }
            if (match.detectedFigureType && !result.figures.includes(match.detectedFigureType)) {
                result.figures.push(match.detectedFigureType);
            }
            if (match.detectedPatternType && !result.patterns.includes(match.detectedPatternType)) {
                result.patterns.push(match.detectedPatternType);
            }
            if (match.condition && Object.keys(match.condition).length > 0) {
                Object.entries(match.condition).forEach(([key, value]) => {
                    if (result.conditions[key] === undefined) {
                        result.conditions[key] = value;
                    } else {
                        result.conditions[key] = (result.conditions[key] + value) / 2;
                    }
                });
            }

            if (match.isSimilarity && !match.colorLocked && match.condition && Object.keys(match.condition).length > 0) {
                const condHue = match.condition['GBH'];
                if (condHue !== undefined) {
                    const rawHue = ((condHue % 2 + 1) * 180 - 180 + 360) % 360;
                    const sat = (match.condition['GBS'] + 1) * 50 || 80;
                    const lit = (match.condition['GBL'] + 1) * 50 || 50;
                    const exists = result.colors.some(c => {
                        let hueMatch = Math.abs(c.h - rawHue) < 15 || ((rawHue > 345 || rawHue < 15) && (c.h > 345 || c.h < 15));
                        return hueMatch && Math.abs(c.s - sat) < 20 && Math.abs(c.l - lit) < 20;
                    });
                    if (!exists && result.colors.length < 3) {
                        result.colors.push({ h: rawHue, s: sat, l: lit, name: tokens[j].surface_form + '(類似度)' });
                        console.log(`[InitialAnalysis] 類似度から色を検出: H:${rawHue} S:${sat} L:${lit}`);
                    }
                }
            }
        }
    }

    console.log('[InitialAnalysis] 検出結果:', result);
    return result;
}

export async function makeEvaluateRule(tokenizer, originalText, population, currentZoom = 1.0) {
    if(DEBUG_MER) console.log('評価して、populationオブジェクトのchromsに適応度を振るよ');

    evaluateRules.forEach(rule => {
        if (!rule.colorLocked) {
            rule.weight *= RULE_WEIGHT_DECAY;
        }
    });

    if(DEBUG_MER_2) console.log(`変換前: ${originalText}`);

    let modifiedText = originalText;
    dics.textReplacementPairs.forEach(pair => {
        modifiedText = modifiedText.replaceAll(pair[0], pair[1]);
    });

    let textArray = modifiedText.split(/[．。()（）\n]\s*/);
    if(DEBUG_MER_2) console.log(`変換・分割後：\n%c${textArray}`, "color: #0ff");

    let detectedColors = [];
    let detectedFigures = [];
    let detectedPatterns = [];
    let isRelativeDelta = false;
    let deltaValue = 0;
    let deltaThickness = 0;
    let detectedNeon = null;

    for(let i = 0; i < textArray.length; i++) {
        const singleText = textArray[i];
        if(singleText) {

            const { tempText, protectedWords } = protectExactMatches(singleText, getExactKeywords());
            const rawTokens = tokenizer.tokenize(tempText);
            const tokens = restoreProtectedTokens(rawTokens, protectedWords);

            for(let j = 0; j < tokens.length - 1; j++) {
                const token = tokens[j];
                const nextToken = tokens[j + 1];
                if (!nextToken) break;

                if((token.pos == '名詞') && (nextToken.pos == '名詞')) {
                    const currentWord = token.basic_form === '*' ? token.surface_form : token.basic_form;
                    const currentMatch = await matchDatabase(currentWord, false);
                    if (!currentMatch.found){
                        tokens.splice(j,2,compoundTokens(token, nextToken, '名詞', '複合'));
                        j--; continue;
                    }
                }
                if((token.pos == '動詞') && (nextToken.pos == '動詞')) {
                    tokens.splice(j, 2, compoundTokens(token, nextToken, '動詞', '複合'));
                    j--; continue;
                }
                if((token.pos == '動詞') && (nextToken.pos == '名詞') && (nextToken.pos_detail_1 == '非自立')) {
                    tokens.splice(j, 2, compoundTokens(token, nextToken, '名詞', '複合'));
                    j--; continue;
                }
                if((token.pos == '形容詞') && (nextToken.pos == '名詞') && (nextToken.pos_detail_1 == '接尾')) {
                    tokens.splice(j, 2, compoundTokens(token, nextToken, '名詞', '複合'));
                    j--; continue;
                }
                // ★ 修正1：接頭詞の無限ループ対策
                // 該当する pos_detail_1 のときだけ結合し、それ以外は何もせず次のルールへ進む
                if(token.pos == '接頭詞') {
                    const prefixPosMap = { '名詞接続': '名詞', '動詞接続': '動詞', '形容詞接続': '形容詞' };
                    const newPos = prefixPosMap[token.pos_detail_1];
                    if (newPos) {
                        tokens.splice(j, 2, compoundTokens(token, nextToken, newPos, '接頭詞付き'));
                        j--; continue;
                    }
                }
                if(
                    ((nextToken.pos == '形容詞') && (nextToken.pos_detail_1 == '接尾')) ||
                    ((token.pos == '形容詞') && (nextToken.pos == '動詞') && (nextToken.pos_detail_1 == '非自立'))
                ) {
                    tokens.splice(j, 2, compoundTokens(token, nextToken, '形容詞', '複合'));
                    j--; continue;
                }
                if(
                    ((token.pos == '形容詞') || (token.pos == '名詞')) &&
                    (nextToken.pos == '動詞') &&
                    (nextToken.reading && nextToken.reading.startsWith('スギ'))
                ) {
                    tokens.splice(j, 2, compoundTokens(token, nextToken, token.pos, '複合'));
                    j--; continue;
                }
                if((nextToken.pos == '助詞') || (nextToken.pos == '助動詞')) {
                    tokens.splice(j, 2, compoundTokens(token, nextToken));
                    j--; continue;
                }
            }

            for(let j = 1; j < tokens.length; j++){
                const current = tokens[j];
                if(
                    current.negative ||
                    current.surface_form.match(/ない|なく|ません|ぬ|ん|しないで/)
                ){
                    tokens[j - 1].negative = true;
                }
            }

            const skipPos = new Set(['助詞', '助動詞', '記号']);
            const skipBasicForms = new Set([
                '画像', '画像を', '生成', '作成', '作っ', '作って', '描い', '描いて', 'デザイン', '絵', '表示',
                'くして','くし','く','いい','感じ','もの','こと','やつ','する', 'して', 'した', 'る', 'なる',
                'なっ', 'ある', 'いる', 'もらう', 'くれる', 'あげる', 'ほしい', 'たい', 'くださる', 'もらえる',
                'どちら', 'どちらも', 'どっち', 'どれ', 'これ', 'それ', 'あれ', 'ここ', 'そこ', 'あそこ',
                'っぽい', 'みたい', 'みたいだ', 'ようだ', 'ような', 'そう', '使う', '使って', '使った',
                'つかう', 'つかって','前','後ろ','的',
                '反転', '反対', '補色', '逆', '入れ替え', '交換', '入れ替えて'
            ]);
            let severity = 0.2;
            for(let j = 0; j < tokens.length; j++) {
                const pos = tokens[j].pos;
                const emptyMatch = { found: false, topic: [], condition: {}, adjustSeverity: 1, colorLocked: false, detectedHue: null, detectedSaturation: null, detectedLightness: null, detectedFigureType: null, detectedPatternType: null, isDelta: false, isNeon: false, isSimilarity: false };

                if (skipPos.has(pos)) {
                    tokens[j].matchDatabase = emptyMatch;
                } else if (skipBasicForms.has(tokens[j].basic_form)) {
                    tokens[j].matchDatabase = emptyMatch;
                } else {
                    let searchWord = (tokens[j].basic_form === '*') ? tokens[j].surface_form : tokens[j].basic_form;
                    let allowParentSimilarity = tokens[j].children ? false : true;
                    let combinedMatch = await matchDatabase(searchWord, allowParentSimilarity);

                    if (tokens[j].children) {
                        for (let k = 0; k < tokens[j].children.length; k++) {
                            const childToken = tokens[j].children[k];
                            if (skipPos.has(childToken.pos) || skipBasicForms.has(childToken.basic_form)) {
                                continue;
                            }
                            let childWord = (childToken.basic_form === '*') ? childToken.surface_form : childToken.basic_form;
                            let childMatch = await matchDatabase(childWord);

                            if (childMatch.found) {
                                combinedMatch.found = true;
                                childMatch.topic.forEach(t => {
                                    if(!combinedMatch.topic.includes(t)) combinedMatch.topic.push(t);
                                });
                                Object.assign(combinedMatch.condition, childMatch.condition);

                                if (childMatch.colorLocked) combinedMatch.colorLocked = true;
                                if (childMatch.detectedHue !== null) combinedMatch.detectedHue = childMatch.detectedHue;
                                if (childMatch.detectedSaturation !== null) combinedMatch.detectedSaturation = childMatch.detectedSaturation;
                                if (childMatch.detectedLightness !== null) combinedMatch.detectedLightness = childMatch.detectedLightness;
                                if (childMatch.detectedFigureType) combinedMatch.detectedFigureType = childMatch.detectedFigureType;
                                if (childMatch.detectedPatternType) combinedMatch.detectedPatternType = childMatch.detectedPatternType;
                                if (childMatch.isDelta) combinedMatch.isDelta = true;
                                if (childMatch.isNeon) combinedMatch.isNeon = true;
                                combinedMatch.adjustSeverity *= childMatch.adjustSeverity;
                            }
                        }
                    }

                    tokens[j].matchDatabase = combinedMatch;

                    if (tokens[j].matchDatabase.colorLocked) {
                        let h = tokens[j].matchDatabase.detectedHue;
                        let s = tokens[j].matchDatabase.detectedSaturation;
                        let l = tokens[j].matchDatabase.detectedLightness;

                        let isNegated = tokens[j].negative;
                        if (!isNegated) {
                            for(let k = 1; k <= 2; k++) {
                                if (tokens[j+k]) {
                                    if (tokens[j+k].negative || tokens[j+k].surface_form.match(/ない|なく|ません|ぬ|ん/)) {
                                        isNegated = true;
                                        break;
                                    }
                                    if (tokens[j+k].pos === '名詞') break;
                                }
                            }
                        }

                        let isRedWrap = (h > 345 || h < 15);
                        let exists = detectedColors.some(c => {
                            let hueMatch = Math.abs(c.h - h) < 15 || (isRedWrap && (c.h > 345 || c.h < 15));
                            return hueMatch && Math.abs(c.s - s) < 20 && Math.abs(c.l - l) < 20 && c.negative === isNegated;
                        });

                        if (!exists) {
                            detectedColors.push({ h, s, l, name: tokens[j].surface_form, negative: isNegated });
                        }
                    }

                    if (tokens[j].matchDatabase.detectedFigureType) {
                        let fig = tokens[j].matchDatabase.detectedFigureType;
                        let isFigNegated = tokens[j].negative;
                        if (!isFigNegated) {
                            for(let k = 1; k <= 2; k++) {
                                if (tokens[j+k]) {
                                    if (tokens[j+k].negative || tokens[j+k].surface_form.match(/ない|なく|ません|ぬ|ん|しないで/)) {
                                        isFigNegated = true;
                                        break;
                                    }
                                    if (tokens[j+k].pos === '名詞') break;
                                }
                            }
                        }
                        if (!detectedFigures.some(f => f.type === fig && f.negative === isFigNegated)) {
                            detectedFigures.push({ type: fig, negative: isFigNegated });
                        }
                    }

                    if (tokens[j].matchDatabase.detectedPatternType) {
                        let pat = tokens[j].matchDatabase.detectedPatternType;
                        let isPatNegated = tokens[j].negative;
                        if (!isPatNegated) {
                            for(let k = 1; k <= 2; k++) {
                                if (tokens[j+k]) {
                                    if (tokens[j+k].negative || tokens[j+k].surface_form.match(/ない|なく|ません|ぬ|ん|しないで/)) {
                                        isPatNegated = true;
                                        break;
                                    }
                                    if (tokens[j+k].pos === '名詞') break;
                                }
                            }
                        }
                        if (!detectedPatterns.some(p => p.type === pat && p.negative === isPatNegated)) {
                            detectedPatterns.push({ type: pat, negative: isPatNegated });
                        }
                    }

                    if (tokens[j].matchDatabase.isDelta) {
                        isRelativeDelta = true;
                        const cond = tokens[j].matchDatabase.condition;
                        if (cond && cond['GFX'] !== undefined) {
                            deltaValue = cond['GFX'];
                        } else if (cond && cond['GFZ'] !== undefined) {
                            deltaValue = cond['GFZ'];
                        }
                        if (cond && cond['GSW'] !== undefined) {
                            deltaThickness = cond['GSW'];
                        }
                    }

                    if (tokens[j].matchDatabase.isNeon) {
                        detectedNeon = !tokens[j].negative;
                    }
                }
                severity *= tokens[j].matchDatabase.adjustSeverity;
            }

            let topicKeys = [['IL','IR','GBH','GBS','GBL','GGT','GGC','GWL','GWA','GWS','GFT','GCX','GCY','GFR','GFZ','GFY','GFX','GFH','GFS','GFL','GFA','GSH','GSS','GSL','GSA','GSW','GRD','GRC','GRR','GRZ','GRH','GRS','GRL','ICA','ICE','IAL','IAB','IBT','IWM','ISH','ISM']];
            let condition = new Object();

            tokens.forEach(phrase => {
                if(phrase.matchDatabase.topic.length > 0) {
                    topicKeys.push(phrase.matchDatabase.topic);
                }
                let conditionKeyOfSingleToken = Object.entries(phrase.matchDatabase.condition);
                let coefficient = 1;

                if (phrase.negative || phrase.over) {
                    coefficient = -1;
                }
                conditionKeyOfSingleToken.forEach(pair => {
                    let key = pair[0];
                    let value = pair[1] * coefficient;

                    if(!condition[key]) {
                        condition[key] = { grade: [], deltaGrade: [], stat: [] };
                    }

                    if (phrase.matchDatabase.isDelta) {
                        condition[key].deltaGrade.push(value);
                    } else {
                        condition[key].grade.push(value);
                    }
                });

                if (phrase.over) {
                    if (!condition["FGD"]) {
                        condition["FGD"] = { grade: [], deltaGrade: [], stat: [] };
                    }
                    condition["FGD"].grade.push(-1);
                    severity *= 2;
                }
            });

            let intersectionTopicKeys = [];
            if(topicKeys.length > 0) {
                intersectionTopicKeys = JSON.parse(JSON.stringify(topicKeys[0]));
                if(topicKeys.length > 1) {
                    for(let j = 0; j < intersectionTopicKeys.length; j++) {
                        let searchKey = intersectionTopicKeys[j];
                        let isContainAll = true;
                        for(let k = 1; k < topicKeys.length; k++) {
                            if(topicKeys[k].includes(searchKey) == false) {
                                isContainAll = false;
                                break;
                            }
                        }
                        if(!isContainAll) {
                            intersectionTopicKeys.splice(j, 1);
                            j--;
                        }
                    }
                }
            }

            let referredImage;
            let referredChromId = [population.bestChromId, population.pickupChromId];
            if(intersectionTopicKeys.includes('IL') && !intersectionTopicKeys.includes('IR')) {
                referredImage = [referredChromId[0]];
            } else if(!intersectionTopicKeys.includes('IL') && intersectionTopicKeys.includes('IR')) {
                referredImage = [referredChromId[1]];
            } else {
                referredImage = [referredChromId[0], referredChromId[1]];
            }

            referredImage.forEach(chromId => {
                let chrom = population.chroms[chromId];
                intersectionTopicKeys.forEach(topicKey => {
                    if(!condition[topicKey]) {
                        condition[topicKey] = { grade: [], deltaGrade: [], stat: [] };
                    }
                    let valueOfTopic = getChromValue(chrom, topicKey);
                    valueOfTopic.forEach(value => {
                        condition[topicKey].stat.push(value);
                    });
                });
            });

            let newRule = {
                'weight': 1,
                'severity': severity,
                'target' : new Object()
            };

            let conditionEntries = Object.entries(condition);
            conditionEntries.forEach(entry => {
                const keyName = entry[0];
                const values = entry[1];

                const grade = values.grade || [];
                const deltaGrade = values.deltaGrade || [];
                const stat = values.stat || [];

                let gradeAverage = 0;
                if(grade.length > 0) {
                    grade.forEach(value => { gradeAverage += value / grade.length; });
                }

                let deltaGradeAverage = 0;
                if(deltaGrade.length > 0) {
                    deltaGrade.forEach(value => { deltaGradeAverage += value / deltaGrade.length; });
                }

                if(keyName == "FGD") {
                    newRule.weight = gradeAverage;
                } else if(keyName == 'IL' || keyName == 'IR') {
                } else {
                    let targetValues = [];

                    if (deltaGrade.length > 0 && stat.length > 0) {
                        stat.forEach(value => {
                            let target = value + (deltaGradeAverage * severity);
                            target = Math.max(-1.0, Math.min(1.0, target));
                            targetValues.push(target);
                        });
                    } else if (stat.length > 0 && grade.length == 0) {
                        stat.forEach(value => { targetValues.push(value); });
                    } else if(stat.length > 0 && grade.length > 0) {
                        if (["GBH", "GFH", "GRH", "GSH"].includes(keyName)) {
                            targetValues.push(gradeAverage);
                        } else {
                            stat.forEach(value => {
                                targetValues.push(gradeAverage);
                            });
                        }
                    } else if(grade.length > 0){
                        targetValues = Array.from(new Set(grade));
                    }

                    if (targetValues.length > 0) {
                        newRule.target[keyName] = targetValues;
                    }
                }
            });

            const hasColorToken = tokens.some(t => t.matchDatabase && t.matchDatabase.colorLocked);
            if (hasColorToken) {
                newRule.colorLocked = true;
                evaluateRules.forEach(r => r.colorLocked = false);
            }

            if (!newRule.colorLocked) {
                evaluateRules.push(newRule);
            }
        }
    }

    if (originalText.match(/入れ替え|交換|逆にして/)) {
        let targetId = population.bestChromId;
        if (originalText.match(/右/)) {
            targetId = population.pickupChromId;
        }

        const targetChrom = population.chroms[targetId];
        const bgH = Number(targetChrom.bgColor_hue);
        const bgS = Number(targetChrom.bgColor_saturation);
        const bgL = Number(targetChrom.bgColor_lightness);
        const fgH = Number(targetChrom.fg_fill_hue);
        const fgS = Number(targetChrom.fg_fill_saturation);
        const fgL = Number(targetChrom.fg_fill_lightness);

        const shapeKeys = [
            'fg_type', 'fg_type2', 'fg_pattern',
            'fg_size_x0', 'fg_size_x1', 'fg_size_x2',
            'fg_size_y0', 'fg_size_y1', 'fg_size_y2',
            'fg_stroke_width',
            'fg_repeat_origin_x', 'fg_repeat_origin_y',
            'fg_repeat_direction_vas', 'fg_repeat_direction_vat',
            'fg_repeat_direction_vbx', 'fg_repeat_direction_vby',
            'fg_repeat_count_va', 'fg_repeat_count_vb',
            'fg_repeat_rotate_origin', 'fg_repeat_rotate_va', 'fg_repeat_rotate_vb',
            'fg_repeat_changeA_size', 'fg_repeat_changeB_size',
            'bgGradient_type', 'bgGradient_center_x', 'bgGradient_center_y',
            'bgGradient_wave_len', 'bgGradient_wave_angle'
        ];
        let lockedShapeData = {};
        shapeKeys.forEach(key => lockedShapeData[key] = targetChrom[key]);

        population.chroms.forEach(chrom => {
            chrom.bgColor_hue                  = fgH;
            chrom.bgGradient_color_hue         = fgH;
            chrom.bgColor_saturation           = fgS;
            chrom.bgGradient_color_saturation  = fgS;
            chrom.bgColor_lightness            = fgL;
            chrom.bgGradient_color_lightness   = fgL;

            chrom.fg_fill_hue                  = bgH;
            chrom.fg_fill_saturation           = bgS;
            chrom.fg_fill_lightness            = bgL;
            chrom.fg_stroke_color_hue          = 0;

            chrom.fg_repeat_changeA_hue        = 0;
            chrom.fg_repeat_changeA_saturation = 0;
            chrom.fg_repeat_changeA_lightness  = 0;

            // 図形色・柄の色を確実に反映
            chrom._absolute_colorB = `hsla(${bgH}, ${bgS}%, ${bgL}%, 1)`;

            shapeKeys.forEach(key => chrom[key] = lockedShapeData[key]);
        });

        evaluateRules.forEach(r => r.colorLocked = false);
        evaluateRules.push({
            weight: 1, severity: 2.0,
            target: {
                'GBH': [hueToDictScale(fgH)], 'GBS': [fgS / 50 - 1], 'GBL': [fgL / 50 - 1],
                'GFH': [hueToDictScale(bgH)], 'GFS': [bgS / 50 - 1], 'GFL': [bgL / 50 - 1]
            },
            colorLocked: true
        });
        evaluateRules.push({ weight: 0, severity: 0, target: {}, lockedFigure: lockedShapeData.fg_type, lockedPattern: lockedShapeData.fg_pattern });
    }
    else if (originalText.match(/反転|反対|補色|逆の色/)) {
        let targetId = population.bestChromId;
        if (originalText.match(/右/)) {
            targetId = population.pickupChromId;
        }

        const targetChrom = population.chroms[targetId];
        const currentBgH = Number(targetChrom.bgColor_hue);
        const currentFgH = Number(targetChrom.fg_fill_hue);
        const currentBgS = Number(targetChrom.bgColor_saturation);
        const currentBgL = Number(targetChrom.bgColor_lightness);
        const currentFgS = Number(targetChrom.fg_fill_saturation);
        const currentFgL = Number(targetChrom.fg_fill_lightness);

        const shapeKeys = [
            'fg_type', 'fg_type2', 'fg_pattern',
            'fg_size_x0', 'fg_size_x1', 'fg_size_x2',
            'fg_size_y0', 'fg_size_y1', 'fg_size_y2',
            'fg_stroke_width',
            'fg_repeat_origin_x', 'fg_repeat_origin_y',
            'fg_repeat_direction_vas', 'fg_repeat_direction_vat',
            'fg_repeat_direction_vbx', 'fg_repeat_direction_vby',
            'fg_repeat_count_va', 'fg_repeat_count_vb',
            'fg_repeat_rotate_origin', 'fg_repeat_rotate_va', 'fg_repeat_rotate_vb',
            'fg_repeat_changeA_size', 'fg_repeat_changeB_size',
            'bgGradient_type', 'bgGradient_center_x', 'bgGradient_center_y',
            'bgGradient_wave_len', 'bgGradient_wave_angle'
        ];
        let lockedShapeData = {};
        shapeKeys.forEach(key => lockedShapeData[key] = targetChrom[key]);

        const invertedBgH = (currentBgH + 180) % 360;
        const invertedFgH = (currentFgH + 180) % 360;
        const invertedBgL = 100 - currentBgL;
        const invertedFgL = 100 - currentFgL;

        population.chroms.forEach(chrom => {
            chrom.bgColor_hue                  = invertedBgH;
            chrom.bgGradient_color_hue         = invertedBgH;
            chrom.bgColor_saturation           = currentBgS;
            chrom.bgGradient_color_saturation  = currentBgS;
            chrom.bgColor_lightness            = invertedBgL;
            chrom.bgGradient_color_lightness   = invertedBgL;

            chrom.fg_fill_hue                  = invertedFgH;
            chrom.fg_fill_saturation           = currentFgS;
            chrom.fg_fill_lightness            = invertedFgL;
            chrom.fg_stroke_color_hue          = 0;

            chrom.fg_repeat_changeA_hue        = 0;
            chrom.fg_repeat_changeA_saturation = 0;
            chrom.fg_repeat_changeA_lightness  = 0;

            // 図形色・柄の色を確実に反映
            chrom._absolute_colorB = `hsla(${invertedFgH}, ${currentFgS}%, ${invertedFgL}%, 1)`;

            shapeKeys.forEach(key => chrom[key] = lockedShapeData[key]);
        });

        evaluateRules.forEach(r => r.colorLocked = false);
        evaluateRules.push({
            weight: 1, severity: 2.0,
            target: {
                'GBH': [hueToDictScale(invertedBgH)], 'GBS': [currentBgS / 50 - 1], 'GBL': [invertedBgL / 50 - 1],
                'GFH': [hueToDictScale(invertedFgH)], 'GFS': [currentFgS / 50 - 1], 'GFL': [invertedFgL / 50 - 1]
            },
            colorLocked: true
        });
        evaluateRules.push({ weight: 0, severity: 0, target: {}, lockedFigure: lockedShapeData.fg_type, lockedPattern: lockedShapeData.fg_pattern });
    }
    else if (detectedColors.length > 0) {
        const positiveColors = detectedColors.filter(c => !c.negative);
        const negativeColors = detectedColors.filter(c => c.negative);

        if (positiveColors.length === 1) {
            const { h, s, l, name } = positiveColors[0];
            const wantsBg = originalText.match(/背景|後ろ|全体|地の色/);
            const wantsFg = originalText.match(/中/);
            const onlyFg = wantsFg && !wantsBg;
            const onlyBg = wantsBg && !wantsFg;

            population.chroms.forEach(chrom => {
                if (!onlyFg) {
                    chrom.bgColor_hue                  = h;
                    chrom.bgGradient_color_hue         = h;
                    chrom.bgColor_saturation           = s * 0.8;
                    chrom.bgGradient_color_saturation  = s * 0.8;
                    let bgLightness = l > 50 ? Math.max(0, l - 40) : Math.min(100, l + 40);
                    if (onlyBg) bgLightness = l;
                    chrom.bgColor_lightness            = bgLightness;
                    chrom.bgGradient_color_lightness   = bgLightness;
                }
                if (!onlyBg) {
                    chrom.fg_fill_hue                  = h;
                    chrom.fg_fill_saturation           = s;
                    chrom.fg_fill_lightness            = l;
                    chrom.fg_stroke_color_hue          = 0;
                    chrom.fg_repeat_changeA_hue        = 0;
                    chrom.fg_repeat_changeA_saturation = 0;
                    chrom.fg_repeat_changeA_lightness  = 0;
                }
            });
            evaluateRules.push({ weight: 0, severity: 0, target: {}, lockedColor: { h, s, l } });

            if (negativeColors.length > 0) {
                let colorRule = {
                    'weight': 1, 'severity': 0.2, 'target': new Object(), 'colorLocked': true,
                    'negativeColors': negativeColors.map(c => hueToDictScale(c.h))
                };
                evaluateRules.forEach(r => r.colorLocked = false);
                evaluateRules.push(colorRule);
            }
        }
        else if (positiveColors.length === 2) {
            const [colorBg, colorFg] = positiveColors;
            population.chroms.forEach(chrom => {
                chrom.bgColor_hue                  = colorBg.h;
                chrom.bgGradient_color_hue         = colorBg.h;
                chrom.bgColor_saturation           = colorBg.s * 0.9;
                chrom.bgGradient_color_saturation  = colorBg.s * 0.9;
                chrom.bgColor_lightness            = colorBg.l;
                chrom.bgGradient_color_lightness   = colorBg.l;

                // 2つ目の色を柄・図形色として確実に上書き適用
                chrom.fg_fill_hue                  = colorFg.h;
                chrom.fg_fill_saturation           = colorFg.s;
                chrom.fg_fill_lightness            = colorFg.l;
                chrom.fg_stroke_color_hue          = 0;

                chrom.fg_repeat_changeA_hue        = 0;
                chrom.fg_repeat_changeA_saturation = 0;
                chrom.fg_repeat_changeA_lightness  = 0;

                // 絶対色指定（チェック柄などに使われる専用変数）にも確実に入れる
                chrom._absolute_colorB = `hsla(${colorFg.h}, ${colorFg.s}%, ${colorFg.l}%, 1)`;
            });

            evaluateRules.forEach(r => r.colorLocked = false);
            evaluateRules.push({
                weight: 1, severity: 2.0,
                target: {
                    'GBH': [hueToDictScale(colorBg.h)], 'GBS': [colorBg.s / 50 - 1], 'GBL': [colorBg.l / 50 - 1],
                    'GFH': [hueToDictScale(colorFg.h)], 'GFS': [colorFg.s / 50 - 1], 'GFL': [colorFg.l / 50 - 1]
                },
                colorLocked: true
            });

            if (negativeColors.length > 0) {
                let colorRule = {
                    'weight': 1, 'severity': 0.2, 'target': new Object(), 'colorLocked': true,
                    'negativeColors': negativeColors.map(c => hueToDictScale(c.h))
                };
                evaluateRules.push(colorRule);
            }
        }
        else if (positiveColors.length >= 3) {
            const [colorBg, colorFg, colorPattern] = positiveColors;
            population.chroms.forEach(chrom => {
                chrom.bgColor_hue                  = colorBg.h;
                chrom.bgGradient_color_hue         = colorBg.h;
                chrom.bgColor_saturation           = colorBg.s * 0.9;
                chrom.bgGradient_color_saturation  = colorBg.s * 0.9;
                chrom.bgColor_lightness            = colorBg.l;
                chrom.bgGradient_color_lightness   = colorBg.l;

                chrom.fg_fill_hue                  = colorFg.h;
                chrom.fg_fill_saturation           = colorFg.s;
                chrom.fg_fill_lightness            = colorFg.l;
                chrom.fg_stroke_color_hue          = 0;

                chrom.fg_repeat_changeA_hue        = 0;
                chrom.fg_repeat_changeA_saturation = 0;
                chrom.fg_repeat_changeA_lightness  = 0;

                chrom._absolute_colorB = `hsla(${colorPattern.h}, ${colorPattern.s}%, ${colorPattern.l}%, 1)`;
            });

            evaluateRules.forEach(r => r.colorLocked = false);
            evaluateRules.push({
                weight: 1, severity: 2.0,
                target: {
                    'GBH': [hueToDictScale(colorBg.h)], 'GBS': [colorBg.s / 50 - 1], 'GBL': [colorBg.l / 50 - 1],
                    'GFH': [hueToDictScale(colorFg.h)], 'GFS': [colorFg.s / 50 - 1], 'GFL': [colorFg.l / 50 - 1]
                },
                colorLocked: true
            });

            if (negativeColors.length > 0) {
                let colorRule = {
                    'weight': 1, 'severity': 0.2, 'target': new Object(), 'colorLocked': true,
                    'negativeColors': negativeColors.map(c => hueToDictScale(c.h))
                };
                evaluateRules.push(colorRule);
            }
        }
        else if (positiveColors.length === 0 && negativeColors.length > 0) {
            let colorRule = {
                'weight': 1,
                'severity': 0.2,
                'target': new Object(),
                'colorLocked': true,
                'negativeColors': negativeColors.map(c => hueToDictScale(c.h))
            };
            evaluateRules.forEach(r => r.colorLocked = false);
            evaluateRules.push(colorRule);
        }
    }

    if (detectedFigures.length > 0 || detectedPatterns.length > 0) {
        const positiveFigureTypes = detectedFigures.filter(f => !f.negative).map(f => f.type);
        const negativeFigureTypes = detectedFigures.filter(f => f.negative).map(f => f.type);
        const positivePatternTypes = detectedPatterns.filter(p => !p.negative).map(p => p.type);
        const negativePatternTypes = detectedPatterns.filter(p => p.negative).map(p => p.type);

        if (negativeFigureTypes.length > 0 || negativePatternTypes.length > 0) {
            let shapeRule = {
                'weight': 1,
                'severity': 0.2,
                'target': new Object(),
                'negativeFigures': negativeFigureTypes,
                'negativePatterns': negativePatternTypes
            };
            evaluateRules.push(shapeRule);
        }

        if (positiveFigureTypes.length >= 2) {
            const [figA, figB] = positiveFigureTypes;
            population.chroms.forEach(chrom => {
                chrom.fg_type = figA;
                chrom.fg_type2 = figB;
                chrom.fg_pattern = 'none';
            });
        } else if (positiveFigureTypes.length === 1) {
            const fig = positiveFigureTypes[0];
            population.chroms.forEach(chrom => {
                chrom.fg_type = fig;
                chrom.fg_pattern = 'none';
                chrom.fg_type2 = null;
            });
            evaluateRules.push({ weight: 0, severity: 0, target: {}, lockedFigure: fig, lockedPattern: 'none' });
        }

        if (positivePatternTypes.length >= 1) {
            const pat = positivePatternTypes[0];
            population.chroms.forEach(chrom => {
                chrom.fg_pattern = pat;
            });
            evaluateRules.push({ weight: 0, severity: 0, target: {}, lockedPattern: pat });
        }
    }

    if (isRelativeDelta) {
        const parentShape = population.chroms[population.bestChromId].fg_type;
        population.chroms.forEach(chrom => {
            chrom.fg_type = parentShape;

            if (deltaValue !== 0) {
                const ratio = 1 + deltaValue;
                ['fg_size_x0', 'fg_size_x1', 'fg_size_x2', 'fg_size_y0', 'fg_size_y1', 'fg_size_y2'].forEach(key => {
                    let currentVal = Number(chrom[key] || 0);
                    let scale = (currentVal + 1) / 2;
                    let newScale = scale * ratio;
                    chrom[key] = Math.max(-0.95, Math.min(0.95, newScale * 2 - 1));
                });
            }

            if (deltaThickness !== 0) {
                const currentSW = Number(chrom.fg_stroke_width || 0);
                const newSW = Math.max(0, Math.min(10, currentSW + deltaThickness * 5));
                chrom.fg_stroke_width = newSW;

                const currentY0 = Number(chrom.fg_size_y0 || 0);
                const newY0 = Math.max(-0.95, Math.min(0.95, currentY0 + deltaThickness));
                chrom.fg_size_y0 = newY0;
                const currentY1 = Number(chrom.fg_size_y1 || 0);
                chrom.fg_size_y1 = Math.max(-0.95, Math.min(0.95, currentY1 + deltaThickness));
            }
        });
    }

    if (detectedNeon !== null) {
        population.chroms.forEach(chrom => {
            chrom.effect_neon = detectedNeon;
        });
    }

    if (currentZoom !== 1.0) {
        const zoomDelta = 0.15 * Math.log2(currentZoom);
        const ratio = 1.0 + zoomDelta;

        const parentFigure  = population.chroms[population.bestChromId].fg_type;
        const parentPattern = population.chroms[population.bestChromId].fg_pattern;

        population.chroms.forEach(chrom => {
            chrom.fg_type    = parentFigure;
            chrom.fg_pattern = parentPattern;
            ['fg_size_x0', 'fg_size_x1', 'fg_size_x2', 'fg_size_y0', 'fg_size_y1', 'fg_size_y2'].forEach(key => {
                let currentVal = Number(chrom[key] || 0);
                let scale = (currentVal + 1) / 2;
                let newScale = scale * ratio;
                chrom[key] = Math.max(-0.95, Math.min(0.95, newScale * 2 - 1));
            });
        });
    }

    // 評価ルールの中に「色」や「明るさ」の指定があったかチェックし、
    // 指定があれば極端な色（0や100）を許可するフラグを立てる
    window.allowExtremeColor = evaluateRules.some(r =>
        r.colorLocked || (r.target && (r.target['GBL'] || r.target['GFL']))
    );
}

export function setFitnessScore(chrom) {
    let fitness = 0;
    evaluateRules.forEach(rule => {
        const weight = rule.weight;
        const severity = rule.severity;
        const targets = Object.entries(rule.target);
        let ruleScore = 0;

        targets.forEach(target => {
            const topicKey = target[0];
            const targetValues = target[1];
            const chromValues = getChromValue(chrom, topicKey);
            if(chromValues.length > 0) {
                let bestMatchScore = 0;
                let angleFlag = ["GBH", "GWA", "GFH", "GFR", "GSH", "GRD", "GRR"].includes(topicKey);

                targetValues.forEach(targetValue => {
                    chromValues.forEach(chromValue => {
                        let devitation = 0;
                        if(angleFlag) {
                            devitation = Math.pow(Math.sin(0.5 * (targetValue - chromValue)), 2);
                        } else {
                            devitation = Math.abs(targetValue - chromValue);
                        }
                        let currentScore = Math.pow(Math.E, (-921 * Math.pow(severity, 3) * Math.pow(devitation, 2)));
                        if (currentScore > bestMatchScore) {
                            bestMatchScore = currentScore;
                        }
                    });
                });
                ruleScore += weight * bestMatchScore;
            }
        });
        fitness += ruleScore;

        if (rule.target['GBH'] && rule.target['GBH'].length >= 2) {
            const requiredColors = rule.target['GBH'];
            const currentBgH = hueToDictScale(Number(chrom.bgColor_hue));
            const currentFgH = hueToDictScale(Number(chrom.fg_fill_hue));
            let coveredColorCount = 0;

            requiredColors.forEach(tv => {
                let matchBg = Math.pow(Math.sin(0.5 * (tv - currentBgH)), 2) < 0.01;
                let matchFg = Math.pow(Math.sin(0.5 * (tv - currentFgH)), 2) < 0.01;
                if (matchBg || matchFg) coveredColorCount++;
            });

            if (coveredColorCount < requiredColors.length) {
                fitness -= 100;
            }
        }

        if (rule.negativeColors && rule.negativeColors.length > 0) {
            const currentBgH = hueToDictScale(Number(chrom.bgColor_hue));
            const currentFgH = hueToDictScale(Number(chrom.fg_fill_hue));

            rule.negativeColors.forEach(tv => {
                let matchBg = Math.pow(Math.sin(0.5 * (tv - currentBgH)), 2) < 0.06;
                let matchFg = Math.pow(Math.sin(0.5 * (tv - currentFgH)), 2) < 0.06;
                if (matchBg || matchFg) {
                    fitness -= 80;
                }
            });
        }

        if (rule.negativeFigures && rule.negativeFigures.length > 0) {
            if (rule.negativeFigures.includes(chrom.fg_type)) {
                fitness -= 80.0;
            }
        }
        if (rule.negativePatterns && rule.negativePatterns.length > 0) {
            if (rule.negativePatterns.includes(chrom.fg_pattern)) {
                fitness -= 80.0;
            }
        }
    });

    const hasDarkRule = evaluateRules.some(r => {
        const wantsDarkBg = r.target['GBL'] && r.target['GBL'].some(v => v < -0.4);
        const wantsDarkFg = r.target['GFL'] && r.target['GFL'].some(v => v < -0.4);
        return wantsDarkBg || wantsDarkFg;
    });

    if (!hasDarkRule) {
        const bgLit = Number(chrom.bgColor_lightness);
        const fgLit = Number(chrom.fg_fill_lightness);

        if (bgLit < 30 && fgLit < 30) {
            fitness -= 10;
        } else if (bgLit < 20 || fgLit < 20) {
            fitness -= 5;
        }
    }

    chrom._fitness = fitness;
}

const chromKeys = {
    "GBH": ["bgColor_hue", "bgGradient_color_hue"],
    "GBS": ["bgColor_saturation", "bgGradient_color_saturation"],
    "GBL": ["bgColor_lightness", "bgGradient_color_lightness"],
    "GGC": ["bgGradient_center_x", "bgGradient_center_y"],
    "GWL": ["bgGradient_wave_len"],
    "GwA": ["bgGradient_wave_angle"],
    "GWS": ["bgGradient_colorStop_0", "bgGradient_colorStop_1"],
    "GCX": ["fg_repeat_origin_x"],
    "GCY": ["fg_repeat_origin_y"],
    "GFR": ["fg_repeat_rotate_origin"],
    "GFZ": ["_calculated|shapeSize"],
    "GFY": ["fg_size_y0"],
    "GFX": ["fg_size_x0"],
    "GFH": ["fg_fill_hue", "_calculated|fgRepeatChangeColorPHue", "_calculated|fgRepeatChangeColorQHue"],
    "GFS": ["fg_fill_saturation", "_calculated|fgRepeatChangeColorPSaturation", "_calculated|fgRepeatChangeColorQSaturation"],
    "GFL": ["fg_fill_lightness", "_calculated|fgRepeatChangeColorPLightness", "_calculated|fgRepeatChangeColorQLightness"],
    "GFA": ["fg_fill_alpha"],
    "GSH": ["_calculated|fgStrokeColorHue"],
    "GSS": ["_calculated|fgStrokeColorSaturation"],
    "GSL": ["_calculated|fgStrokeColorLightness"],
    "GSA": ["_calculated|fgStrokeColorAlpha"],
    "GSW": ["fg_stroke_width"],
    "GRD": ["fg_repeat_direction_vat", "fg_repeat_direction_vby"],
    "GRC": ["fg_repeat_count_va", "fg_repeat_count_vb"],
    "GRR": ["fg_repeat_rotate_va", "fg_repeat_rotate_vb"],
    "GRZ": ["_calculated|fgRepeatResizeP", "_calculated|fgRepeatResizeQ"],
    "GRH": ["fg_repeat_changeA_hue", "fg_repeat_changeB_hue"],
    "GRS": ["fg_repeat_changeA_saturation", "fg_repeat_changeB_saturation"],
    "GRL": ["fg_repeat_changeA_lightness", "fg_repeat_changeB_lightness"],
    "ICA": ["_impression|ICA"],
    "ICE": ["_impression|ICE"],
    "IAL": ["_impression|IAL"],
    "IAB": ["_impression|IAB"],
    "IBT": ["_impression|IBT"],
    "IWM": ["_impression|IWM"],
    "ISH": ["_impression|ISH"],
    "ISM": ["_impression|ISM"]
};

const hueLikeKeys = new Set(['GBH', 'GFH', 'GSH', 'GRH']);
const pureAngleKeys = new Set(['GWA', 'GFR', 'GRD', 'GRR']);

function getChromValue(chrom, topicKey) {
    let values = [];
    if(chromKeys[topicKey]) {
        let keyAddress = chromKeys[topicKey];
        keyAddress.forEach(address => {
            let addressArray = address.split('|');
            let chromValue;
            if(addressArray.length == 1) {
                chromValue = chrom[addressArray[0]];
            } else if(addressArray.length == 2) {
                if (chrom[addressArray[0]] === undefined) {
                    chromValue = 0;
                } else {
                    chromValue = chrom[addressArray[0]][addressArray[1]];
                }
            }
            if(DEBUG_GCV) {
                console.log(chromValue);
                if(isNaN(chromValue)) debugger;
            }
            if (hueLikeKeys.has(topicKey)) {
                chromValue = hueToDictScale(Number(chromValue));
            } else if (pureAngleKeys.has(topicKey)) {
                chromValue = (((Number(chromValue) + 360) % 360) / 180) - 1;
            } else if(
                (topicKey == 'GBS') || (topicKey == 'GBL') || (topicKey == 'GFS') ||
                (topicKey == 'GFL') || (topicKey == 'GFA') || (topicKey == 'GSS') ||
                (topicKey == 'GSL') || (topicKey == 'GSA')
            ) {
                chromValue = Number(chromValue) / 50 - 1;
            } else if(topicKey == 'GRC') {
                chromValue = Number(chromValue) / 10 - 1;
            } else if(topicKey == 'GSW') {
                chromValue = Number(chromValue) / 5 - 1;
            } else if(topicKey == 'GRZ') {
                chromValue = Number(chromValue) / 2 - 1;
            } else if(topicKey == 'GWL') {
                chromValue = Number(chromValue) - 1;
            } else if(topicKey == 'GWS') {
                chromValue = Number(chromValue) * 2 - 1;
            } else if(
                (topicKey == 'GRS') || (topicKey == 'GRL')
            ) {
                chromValue = Number(chromValue) / 4;
            } else if(topicKey == 'GGC') {
                chromValue = Number(chromValue) / 2;
            } else if(topicKey == 'GFZ') {
                chromValue = Number(chromValue) / 1;
            } else if(topicKey == 'GFY') {
                chromValue = Number(chromValue);
            } else if(topicKey == 'GFX') {
                chromValue = Number(chromValue);
            } else if((topicKey == 'GCX') || (topicKey == 'GCY')) {
                chromValue = Number(chromValue) / 3 * 5;
            }
            values.push(chromValue);
        });
    }
    return values;
}

function compoundTokens(token0, token1, pos = '文節', pos_detail_1 = '*') {
    const compoundToken = new Object();
    compoundToken.word_id = '*';
    compoundToken.word_type = 'COMPOUNDED';
    compoundToken.word_position = token0.word_position;
    compoundToken.surface_form = token0.surface_form + token1.surface_form;
    if(
        (token1.conjugated_type == '特殊・ナイ') ||
        (token1.conjugated_type == '特殊・ヌ')
    ) {
        compoundToken.basic_form = (token0.basic_form == '*' ? token0.surface_form : token0.basic_form);
        compoundToken.negative = true;
    } else if(token0.negative) {
        compoundToken.basic_form = token0.basic_form + (token1.basic_form == '*' ? token1.surface_form : token1.basic_form);
        compoundToken.negative = true;
    } else {
        compoundToken.basic_form = token0.surface_form + (token1.basic_form == '*' ? token1.surface_form : token1.basic_form);
    }
    compoundToken.pos = pos;
    compoundToken.pos_detail_1 = pos_detail_1;
    if(
        (token1.reading == 'スギル' || (token1.reading && token1.reading.startsWith('スギ')))
    ) {
        compoundToken.over = true;
        compoundToken.surface_form = token0.surface_form;
        if (token0.pos === '形容詞') {
            const bf = token0.basic_form !== '*' ? token0.basic_form : token0.surface_form;
            compoundToken.basic_form = bf.endsWith('い') ? bf : bf + 'い';
        } else {
            compoundToken.basic_form = token0.basic_form !== '*' ? token0.basic_form : token0.surface_form;
        }
        compoundToken.word_type = token0.word_type;
        compoundToken.pos_detail_2 = '*';
        compoundToken.pos_detail_3 = '*';
        compoundToken.conjugated_form = token0.conjugated_form;
        compoundToken.conjugated_type = token0.conjugated_type;
        compoundToken.reading = (token0.reading ?? token0.surface_form);
        compoundToken.pronunciation = (token0.pronunciation ?? token0.surface_form);
    } else {
        compoundToken.pos_detail_2 = '*';
        compoundToken.pos_detail_3 = '*';
        compoundToken.conjugated_form = token1.conjugated_form;
        compoundToken.conjugated_type = token1.conjugated_type;
        compoundToken.reading = (token0.reading ?? token0.surface_form) + (token1.reading ?? token1.surface_form);
        compoundToken.pronunciation = (token0.pronunciation ?? token0.surface_form) + (token1.pronunciation ?? token1.surface_form);
    }
    let token0Children = token0.children ?? [token0];
    let token1Children = token1.children ?? [token1];
    compoundToken.children = token0Children.concat(token1Children);
    return compoundToken;
}

async function matchDatabase(phrase, allowSimilarity = true) {
    let foundFlag = false;
    let topicData = [];
    let detectedFigureType = null;
    let detectedPatternType = null;
    let isDeltaFlag = false;
    let isSimilarityMatch = false;

    const shapeKeywords = Object.keys(figureTypeDict).concat(Object.keys(patternTypeDict)).sort((a, b) => b.length - a.length);
    for (const keyword of shapeKeywords) {
        if (phrase === keyword || phrase.includes(keyword)) {
            detectedFigureType = figureTypeDict[keyword] || null;
            detectedPatternType = patternTypeDict[keyword] || null;
            foundFlag = true;
            break;
        }
    }

    for(let i = 0; i < dics.topicKeys.length; i++) {
        if(phrase.match(dics.topicKeys[i])) {
            if(DEBUG_MDB) console.log(dics.topicKeys[i] + 'が言及対象辞書でヒットした: ' + `id: ${i} (${phrase}, ${dics.topic[dics.topicKeys[i]]})`);
            topicData = dics.topic[dics.topicKeys[i]]; foundFlag = true; break;
        }
    }

    if (topicData.length === 0) {
        for(let len = Math.min(phrase.length - 1, 3); len >= 1; len--) {
            const shortPhrase = phrase.slice(0, len);
            for(let i = 0; i < dics.topicKeys.length; i++) {
                if(shortPhrase === dics.topicKeys[i]) {
                    if(DEBUG_MDB) console.log(dics.topicKeys[i] + 'が言及対象辞書でヒットした（短縮）: ' + `(${phrase}→${shortPhrase})`);
                    topicData = dics.topic[dics.topicKeys[i]]; foundFlag = true; break;
                }
            }
            if (topicData.length > 0) break;
        }
    }

    let conditionData = new Object();
    let colorMatched = false;
    let colorSeverityBoost = 1;
    let detectedHue = null;
    let detectedSaturation = null;
    let detectedLightness = null;

    let phraseForColor = phrase;
    for (const keyword of shapeKeywords) {
        if (phraseForColor.includes(keyword)) phraseForColor = phraseForColor.replace(keyword, '');
    }

    let phraseForColorClean = phraseForColor.replace(/色$/, '');

    // dics.color は「完全一致する言葉があるか」の判定にのみ使用（類似度の対象には入れない）
    if (dics.color) {
        for(let i = dics.color.length - 1; i >= 0; i--) {
            const color = dics.color[i];
            let colorMatchFlag = false;
            for(let j = 0; j < color.name.length; j++) {
                if(phraseForColor && (phraseForColor === color.name[j] || phraseForColorClean === color.name[j])) {
                    if(DEBUG_MDB) console.log(color.name[j] + 'が外部色辞書でヒットした: ' + `id: ${i}（元: ${phrase}, 判定: ${phraseForColor}, ${JSON.stringify(color.hsl)}）`);
                    colorMatchFlag = true; foundFlag = true; colorMatched = true;
                    break;
                }
            }
            if (colorMatchFlag) {
                let h = hueToDictScale(color.hsl[0]), s = color.hsl[1] / 50 - 1, l = color.hsl[2] / 50 - 1;
                ["GBH", "GFH", "GRH", "GSH"].forEach(k => { conditionData[k] = h; });
                ["GBS", "GFS", "GRS", "GSS"].forEach(k => { conditionData[k] = s; });
                ["GBL", "GFL", "GRL", "GSL"].forEach(k => { conditionData[k] = l; });
                colorSeverityBoost = 5; detectedHue = color.hsl[0]; detectedSaturation = color.hsl[1]; detectedLightness = color.hsl[2];
                break;
            }
        }
    }

    let adjustSeverity = 1;
    let isSeverityWord = false;
    for(let i = 0; i < adjustSeverityTable.length; i++) {
        if(phrase.match(adjustSeverityTable[i][0])) {
            adjustSeverity = adjustSeverityTable[i][1];
            if(DEBUG_MDB) console.log(`重要度補正：${adjustSeverity} （${adjustSeverityTable[i][0]}）`);
            foundFlag = true; isSeverityWord = true; break;
        }
    }

    if (!colorMatched && !isSeverityWord && topicData.length === 0 && detectedFigureType === null && detectedPatternType === null) {

        let isDensityMatch = false;
        for (const [keyword, conditions] of Object.entries(densityDict)) {
            if (phrase === keyword || phrase.includes(keyword)) {
                conditionData = Object.assign({}, conditions); topicData = ['GFZ', 'GRC', 'GFX', 'GFY'];
                foundFlag = true; isDensityMatch = true; isDeltaFlag = true;
                if(DEBUG_MDB) console.log(`[density] "${phrase}" → サイズ・密度指定(相対値):`, conditions);
                break;
            }
        }

        let isThicknessMatch = false;
        if (!isDensityMatch) {
            for (const [keyword, conditions] of Object.entries(thicknessDict)) {
                if (phrase === keyword || phrase.includes(keyword)) {
                    conditionData = Object.assign({}, conditions); topicData = ['GFY', 'GSW'];
                    foundFlag = true; isThicknessMatch = true; isDeltaFlag = true;
                    if(DEBUG_MDB) console.log(`[thickness] "${phrase}" → 太さ指定(相対値):`, conditions);
                    break;
                }
            }
        }

        let isEmoMatch = false;
        if (!isDensityMatch && !isThicknessMatch) {
            for (const [keyword, conditions] of Object.entries(emoDict)) {
                if (phrase === keyword || phrase.includes(keyword)) {
                    conditionData = Object.assign({}, conditions); topicData = Object.keys(conditions);
                    foundFlag = true; isEmoMatch = true; isDeltaFlag = true;

                    if (keyword.match(/ゆめかわ|キラキラ|マーブル|幻想的/)) {
                        if (!detectedPatternType) detectedPatternType = 'kirakira';
                    } else if (keyword.match(/かわい|カワイイ|キュート/)) {
                        if (!detectedFigureType) detectedFigureType = 'circle';
                    } else if (keyword.match(/ポップ/)) {
                        if (!detectedFigureType) detectedFigureType = 'circle';
                        if (!detectedPatternType) detectedPatternType = 'dot';
                    } else if (keyword.match(/かっこ|カッコ|クール/)) {
                        if (!detectedFigureType) detectedFigureType = 'triangle';
                        if (!detectedPatternType) detectedPatternType = 'stripe';
                    }

                    if(DEBUG_MDB) console.log(`[emo] "${phrase}" → エモさ指定(相対値):`, conditions);
                    break;
                }
            }
        }

        if (!isDensityMatch && !isThicknessMatch && !isEmoMatch) {
            const exactMatch = dics.condition[phrase];
            const shortMatch = !exactMatch && dics.conditionKeys.find(key => phrase.startsWith(key) && key.length >= 2);

            if (exactMatch) {
                conditionData = Object.assign({}, dics.condition[phrase]); foundFlag = true;
                if(DEBUG_MDB) console.log(`[matchDB] "${phrase}" が完全一致`);
            }
            else if (shortMatch) {
                conditionData = Object.assign({}, dics.condition[shortMatch]); foundFlag = true;
                if(DEBUG_MDB) console.log(`[matchDB] "${phrase}" → "${shortMatch}" で部分一致`);
            }
            else {
                // ★ 修正3：類似度計算（対象＝条件キー＋代表色のみ／キャッシュ・タイムアウト付き）
                if (!isSeverityWord) {
                    if (!allowSimilarity) {
                        if(DEBUG_MDB) console.log(`[similarity] "${phrase}" の類似度計算を抑制しました（フラグOFF）`);
                        return { found: false, topic: [], condition: {}, adjustSeverity: 1, colorLocked: false, detectedHue: null, detectedSaturation: null, detectedLightness: null, detectedFigureType: null, detectedPatternType: null, isDelta: false, isNeon: false, isSimilarity: false };
                    }

                    const similar = await safeSimilar(phrase);

                    if (similar && similar.length > 0) {
                        foundFlag = true;
                        isSimilarityMatch = true;
                        if(DEBUG_MDB) console.log(`[similarity] "${phrase}" の類似語:`, similar);

                        const totalScore = similar.reduce((sum, { score }) => sum + score, 0);
                        let firstColorHit = false;

                        similar.forEach(({ word, score }) => {
                            // 代表色のヒット判定
                            if (repColors[word] && !firstColorHit) {
                                colorMatched = true; colorSeverityBoost = 5;
                                detectedHue = repColors[word][0];
                                detectedSaturation = repColors[word][1];
                                detectedLightness = repColors[word][2];
                                firstColorHit = true;
                                if(DEBUG_MDB) console.log(`[similarity:Color] "${phrase}" から代表色の類似語 "${word}" を採用しました`);
                            }

                            // 代表色のコンディションと通常のコンディションの両方を処理
                            const cond = repColorConditions[word] || dics.condition[word];
                            if (cond) {
                                Object.entries(cond).forEach(([key, value]) => {
                                    if (conditionData[key] === undefined) conditionData[key] = 0;
                                    conditionData[key] += value * (score / totalScore);
                                });
                            }
                        });
                    }
                }
            }
        }
    }

    let isNeonFlag = false;
    if (phrase.includes('ネオン') || phrase.includes('発光') || phrase.includes('サイバー') || phrase.includes('光る')) {
        isNeonFlag = true;
    }

    return {
        found: foundFlag,
        topic: topicData,
        condition: conditionData,
        adjustSeverity: adjustSeverity * colorSeverityBoost,
        colorLocked: colorMatched,
        detectedHue: detectedHue,
        detectedSaturation: detectedSaturation,
        detectedLightness: detectedLightness,
        detectedFigureType: detectedFigureType,
        detectedPatternType: detectedPatternType,
        isDelta: isDeltaFlag,
        isNeon: isNeonFlag,
        isSimilarity: isSimilarityMatch
    };
}