/* ========================
CSVからデータセットを取得	ad
colorDataSet: []
\_ {}
	\_ hexCode: String
	\_ rgb: [r, g, b]
	\_ hsl: [h, s, l]
	\_ name: String
	\_ category: String
======================== */

export function getColorsDic() {
	return new Promise(resolve => {
		const xhr = new XMLHttpRequest();
		xhr.open('GET', './assets/colordic.csv');
		xhr.send();

		xhr.addEventListener('load', (event) => {
			const response = event.target.responseText;
			
			let responseArray = response.replaceAll(/\r/g, '').split('\n');
			let colorData = [];
			for(let i = 1; i < responseArray.length; i++) {
				let colorInfo = new Object();
				let responseInfo = responseArray[i].replaceAll(/\s/g, '').split(',');
				let colornames = [];
				responseInfo[1].split('/').forEach(name => {
					colornames.push(name);
				});
				if (responseInfo.length >= 3) {
					responseInfo[2].split('/').forEach(name => {
						colornames.push(name);
					});
				}

				colorInfo.hexCode = responseInfo[0];
				colorInfo.name = colornames;
				let rgb = hexCode2rgb(responseInfo[0]);
				colorInfo.rgb = rgb;
				colorInfo.hsl = rgb2hsl(rgb);
				colorData.push(colorInfo);
			}
			console.log('A 代表色DBの読み込みに完了');
			resolve(colorData);
		});
	});

	function hexCode2rgb (hexCode) {
		let hexCodeNoSharp = `0x${hexCode.replaceAll('#', '')}`;
		let dec = parseInt(hexCodeNoSharp, 16);
		let b = dec % 256;
		let g = (dec - b) / 256 % 256;
		let r = (dec - b - 256 * g) / 65536;
		return [r, g, b];
	}
}


export function rgb2hsl(rgb) {
    let r = rgb[0] / 255;
    let g = rgb[1] / 255;
    let b = rgb[2] / 255;

    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);

    let h = 0;
    let s = 0;
    let l = (max + min) / 2;

    if (max !== min) {
        let d = max - min;

        // 彩度
        s = l > 0.5
            ? d / (2 - max - min)
            : d / (max + min);

        // 色相
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }

        h *= 60;
    }

    return [
        Math.round(h * 10) / 10,
        Math.round(s * 1000) / 10,
        Math.round(l * 1000) / 10
    ];
}

export default async function getColorsFile() {
	try {
		const data = await getColorsDic();
		return data;
	} catch (error) {
		console.error(error);
		return null;
	}
}