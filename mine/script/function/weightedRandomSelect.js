export default function weightedRandomSelect(originArray) {
    // コピー（浅いコピーでOK）
    let probabilityArray = originArray.slice();

    const LOG = 0;

    // 最小値を取得
    let min = Math.min(...probabilityArray);

    // 負の値がある場合は「平行移動」する（比率維持）
    if (min < 0) {
        for (let i = 0; i < probabilityArray.length; i++) {
            probabilityArray[i] -= min;
        }
    }

    // 合計を計算
    let sum = probabilityArray.reduce((acc, v) => acc + v, 0);

    // 全部0だった場合（安全対策）
    if (sum === 0) {
        return Math.floor(Math.random() * probabilityArray.length);
    }

    // ルーレット選択
    let randomValue = Math.random() * sum;
    let index = 0;

    while (randomValue > probabilityArray[index]) {
        randomValue -= probabilityArray[index];
        index++;
    }

    if (LOG) {
        console.log(
            'select:',
            `確率分布 {${probabilityArray}} から index: ${index} が選ばれました`
        );
    }

    return index;
}