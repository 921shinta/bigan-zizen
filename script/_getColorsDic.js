/* ========================
CSVからデータセットを取得
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


export function rgb2hsl (rgb) {
	let r = rgb[0];
	let g = rgb[1];
	let b = rgb[2];
	let max = Math.max(r, g, b);
	let min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	let l = 0;
	if((r >= g) && (r > b)) {
		// rが最大
		h = 60 * (g - b) / (max - min) + 360;
	}else if((g >= b) && (g > r)) {
		// gが最大
		h = 60 * (b - r) / (max - min) + 120;
	}else if((b >= r) && (b > g)) {
		// bが最大
		h = 60 * (r - g) / (max - min) + 240;
	}
	h = h % 360;
	let center = (max + min) / 2;
	if (center == 0 || center == 255) {
		s = 0.5;
	} else if (center < 128) {
		s = (center - min) / center;
	}else {
		s = (max - center) / (255 - center);
	}
	if(isNaN(s)) {
		debugger;
	}
	s *= 100;
	l = (max + min) / 2 / 2.55;
	h = Math.round(h * 10) / 10;
	s = Math.round(s * 10) / 10;
	l = Math.round(l * 10) / 10;
	return [h, s, l];
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