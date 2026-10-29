/**
 * _similarity.js
 * Transformers.js を使って単語間の意味的類似度を計算するモジュール
 */

import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js";

// モデルをローカルではなくHugging Faceから取得する
env.allowLocalModels = false;
env.useBrowserCache = true; // 2回目以降はキャッシュを使う

let extractor = null;
const vectorCache = new Map();

export async function loadModel(onProgress = null) {
    if (extractor) return;
    console.log("[similarity] モデルを読み込み中...");
    extractor = await pipeline(
        "feature-extraction",
        "Xenova/paraphrase-multilingual-mpnet-base-v2",
        { progress_callback: onProgress }
    );
    console.log("[similarity] モデルの読み込み完了");
}

async function getVector(word) {
    if (!extractor) throw new Error("loadModel() を先に呼んでください。");
    if (vectorCache.has(word)) return vectorCache.get(word);
    const output = await extractor(word, { pooling: "mean", normalize: true });
    const vector = output.data;
    vectorCache.set(word, vector);
    return vector;
}

function cosineSimilarity(vecA, vecB) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot   += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function getSimilarWords(inputWord, dictWords, topN = 3, threshold = 0.5) {
    const inputVec = await getVector(inputWord);
    const scores = [];
    for (const dictWord of dictWords) {
        const dictVec = await getVector(dictWord);
        const score = cosineSimilarity(inputVec, dictVec);
        if (score >= threshold) scores.push({ word: dictWord, score });
    }
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topN);
}

export async function preloadDictVectors(dictWords, onProgress = null) {
    console.log(`[similarity] 辞書 ${dictWords.length} 件を事前ベクトル化中...`);
    for (let i = 0; i < dictWords.length; i++) {
        await getVector(dictWords[i]);
        if (onProgress) onProgress(i + 1, dictWords.length);
    }
    console.log("[similarity] 辞書のベクトル化完了");
}