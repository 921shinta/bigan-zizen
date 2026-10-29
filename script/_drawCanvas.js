export default function drawCanvas(canvas, gen = new Object(), test = false) {
	
	if(canvas.getContext) {
		let ctx = canvas.getContext('2d');
		const CV_WIDTH = Number(canvas.width);
		const CV_HEIGHT = Number(canvas.height);

		/* ========================
		| 背景の描画
		======================== */
		
		// キャンバス上での中心
		let bgOriginX = Number(gen.bgGradient_center_x) * CV_WIDTH + CV_WIDTH / 2;
		let bgOriginY = Number(gen.bgGradient_center_y) * CV_HEIGHT + CV_HEIGHT / 2;

		// キャンバス上での波長
		let waveLen = Number(gen.bgGradient_wave_len) * Math.max(CV_WIDTH, CV_HEIGHT);

		// グラデーションの角度
		let waveAngleRad = torad(gen.bgGradient_wave_angle);
		let bgColors = [
			`hsl(${gen.bgColor_hue} ${gen.bgColor_saturation}% ${gen.bgColor_lightness}%)`,
			`hsl(${gen.bgGradient_color_hue} ${gen.bgGradient_color_saturation}% ${gen.bgGradient_color_lightness}%)`
		];

		// 通過点の位置、三角波ループする
		let bgColorStops = [
			Number(gen.bgGradient_colorStop_0),
			Number(gen.bgGradient_colorStop_1)
		];
		
		let bgStyle = gen.bgGradient_type;
		if(bgStyle == 'none') {
			// グラデーションなし
			ctx.fillStyle = bgColors[0];

		}else if(bgStyle == 'linear') {
			/* ========================
			| | 線形グラデーション
			======================== */

			// 繰り返し回数を計算
			let startCount = 0;
			let endCount = 1;
			let dist = 0;
			while(1) {
				dist = distance([CV_WIDTH / 2, CV_HEIGHT / 2], [(bgOriginX + startCount * waveLen * Math.cos(waveAngleRad)), (bgOriginY + startCount * waveLen * Math.sin(waveAngleRad))]);
				if(dist > distance([0, 0], [CV_WIDTH, CV_HEIGHT]) * 2.5) {
					startCount--;
					break;
				}
				startCount--;
			}
			while(1) {
				dist = distance([CV_WIDTH / 2, CV_HEIGHT / 2], [(bgOriginX + endCount * waveLen * Math.cos(waveAngleRad)), (bgOriginY + endCount * waveLen * Math.sin(waveAngleRad))]);
				if(dist > distance([0, 0], [CV_WIDTH, CV_HEIGHT]) * 2.5) {
					endCount++;
					break;
				}
				endCount++;
			}
			let sectionCount = endCount - startCount;

			// 繰り返し回数だけ範囲を拡張してグラデーション範囲を定義
			let lineargradient = ctx.createLinearGradient(bgOriginX + startCount * waveLen * Math.cos(waveAngleRad), bgOriginY + startCount * waveLen * Math.sin(waveAngleRad), bgOriginX + endCount * waveLen * Math.cos(waveAngleRad), bgOriginY + endCount * waveLen * Math.sin(waveAngleRad));
			
			// 繰り返しに則って通過点を定義
			for(let i = startCount; i < endCount; i++) {
				let loopCount = i - startCount;
				if(i % 2 == 0) {
					lineargradient.addColorStop((loopCount) / sectionCount, bgColors[0]);
					lineargradient.addColorStop((loopCount + bgColorStops[0]) / sectionCount, bgColors[0]);
					lineargradient.addColorStop((loopCount + bgColorStops[1]) / sectionCount, bgColors[1]);
					lineargradient.addColorStop((loopCount + 1) / sectionCount, bgColors[1]);
				}else {
					lineargradient.addColorStop((loopCount) / sectionCount, bgColors[1]);
					lineargradient.addColorStop((loopCount + 1 - bgColorStops[1]) / sectionCount, bgColors[1]);
					lineargradient.addColorStop((loopCount + 1 - bgColorStops[0]) / sectionCount, bgColors[0]);
					lineargradient.addColorStop((loopCount + 1) / sectionCount, bgColors[0]);
				}
			}
			ctx.fillStyle = lineargradient;


		}else if(bgStyle == 'radial') {
			/* ========================
			| | 放射状グラデーション
			======================== */
			let endCount = 1;
			let dist = 0;
			while(1) {
				dist = distance([CV_WIDTH / 2, CV_HEIGHT / 2], [(bgOriginX + endCount * waveLen * Math.cos(waveAngleRad)), (bgOriginY + endCount * waveLen * Math.sin(waveAngleRad))]);
				if(dist > distance([0, 0], [CV_WIDTH, CV_HEIGHT]) * 4.3) {
					endCount++;
					break;
				}
				endCount++;
			}

			// 繰り返し回数だけ範囲を拡張してグラデーション範囲を定義
			let radialgradient = ctx.createRadialGradient(bgOriginX, bgOriginY, 0, bgOriginX, bgOriginY, waveLen * endCount);
			// 角度の値だけ位相をずらす
			let phase = Number(gen.bgGradient_wave_angle) / 180;
			for(let i = 0; i < endCount; i++) {
				if(i % 2 == 0) {
					radialgradient.addColorStop(Math.max(0, i - phase) / endCount, bgColors[0]);
					radialgradient.addColorStop(Math.max(0, i - phase + bgColorStops[0]) / endCount, bgColors[0]);
					radialgradient.addColorStop(Math.max(0, i - phase + bgColorStops[1]) / endCount, bgColors[1]);
					radialgradient.addColorStop(Math.max(0, i - phase + 1) / endCount, bgColors[1]);
				}else {
					radialgradient.addColorStop(Math.max(0, i - phase) / endCount, bgColors[1]);
					radialgradient.addColorStop(Math.max(0, i - phase + 1 - bgColorStops[1]) / endCount, bgColors[1]);
					radialgradient.addColorStop(Math.max(0, i - phase + 1 - bgColorStops[0]) / endCount, bgColors[0]);
					radialgradient.addColorStop(Math.max(0, i - phase + 1) / endCount, bgColors[0]);
				}
			}
			ctx.fillStyle = radialgradient;

		}else if(bgStyle == 'conic') {
			/* ========================
			| | 扇形グラデーション
			======================== */
			
			// 繰り返し回数を計算
			let endCount = 2 / Number(gen.bgGradient_wave_len);

			let conicgradient = ctx.createConicGradient(waveAngleRad, bgOriginX, bgOriginY);
			for(let i = 0; i < endCount; i++) {
				if(i % 2 == 0) {
					conicgradient.addColorStop(Math.min(endCount, i) / endCount, bgColors[0]);
					conicgradient.addColorStop(Math.min(endCount, i + bgColorStops[0]) / endCount, bgColors[0]);
					conicgradient.addColorStop(Math.min(endCount, i + bgColorStops[1]) / endCount, bgColors[1]);
					conicgradient.addColorStop(Math.min(endCount, i + 1) / endCount, bgColors[1]);
				}else {
					conicgradient.addColorStop(Math.min(endCount, i) / endCount, bgColors[1]);
					conicgradient.addColorStop(Math.min(endCount, i + 1 - bgColorStops[1]) / endCount, bgColors[1]);
					conicgradient.addColorStop(Math.min(endCount, i + 1 - bgColorStops[0]) / endCount, bgColors[0]);
					conicgradient.addColorStop(Math.min(endCount, i + 1) / endCount, bgColors[0]);
				}
			}
			ctx.fillStyle = conicgradient;

		}else {
			console.error('draw: gen.bgGradient_type が無効な値です');
		}
		ctx.fillRect(0, 0, CV_WIDTH, CV_HEIGHT);

		/* ========================
		| 図形の描画
		======================== */
		let fgShapeOriginX = Number(gen.fg_repeat_origin_x) * CV_WIDTH + CV_WIDTH / 2;
		let fgShapeOriginY = Number(gen.fg_repeat_origin_y) * CV_HEIGHT + CV_HEIGHT / 2;

		let fgShapeVertex = [
			[Number(gen.fg_size_x0) * CV_WIDTH, Number(gen.fg_size_y0) * CV_HEIGHT],
			[Number(gen.fg_size_x1) * CV_WIDTH, Number(gen.fg_size_y1) * CV_HEIGHT],
			[Number(gen.fg_size_x2) * CV_WIDTH, Number(gen.fg_size_y2) * CV_HEIGHT]
		];

		// 並行して、描画時の計算値を再利用できるようにする
		gen._calculated = new Object();

		let fgFillColorHue = Number(gen.fg_fill_hue);
		let fgFillColorSaturation = Number(gen.fg_fill_saturation);
		let fgFillColorLightness = Number(gen.fg_fill_lightness);
		let fgFillColorAlpha = Number(gen.fg_fill_alpha);
		let fgStrokeWidth = Number(gen.fg_stroke_width);

		const fgStrokeColorHue = Number(gen.fg_stroke_color_hue) + fgFillColorHue;
		const fgStrokeColorSaturation = Number(gen.fg_stroke_color_saturation) + fgFillColorSaturation;
		const fgStrokeColorLightness = Number(gen.fg_stroke_color_lightness) + fgFillColorLightness;
		const fgStrokeColorAlpha = Number(gen.fg_stroke_color_alpha);

		let fgStrokeColor = `hsla(${fgStrokeColorHue} ${fgStrokeColorSaturation}% ${fgStrokeColorLightness}% / ${fgStrokeColorAlpha}%)`;
		
		gen._calculated.fgStrokeColorHue = fgStrokeColorHue;
		gen._calculated.fgStrokeColorSaturation = fgStrokeColorSaturation;
		gen._calculated.fgStrokeColorLightness = fgStrokeColorLightness;
		gen._calculated.fgStrokeColorAlpha = fgStrokeColorAlpha;

		// ABだとalphaと被ってややこしくなるのでPQ
		let fgRepeatCountP = Number(gen.fg_repeat_count_va);
		let fgRepeatCountQ = Number(gen.fg_repeat_count_vb);

		let angleToCenter = 0;
		if (fgShapeOriginX == CV_WIDTH / 2) {
			if (fgShapeOriginY >= 0) angleToCenter = Math.PI / 2;
			else angleToCenter = -1 * Math.PI / 2;
		}else {
			angleToCenter = Math.atan(Number(gen.fg_repeat_origin_y) / Number(gen.fg_repeat_origin_x));
			if(fgShapeOriginX > CV_WIDTH / 2) angleToCenter += Math.PI;
		}

		let fgRepeatVectorP = [
			Number(gen.fg_repeat_direction_vas) * Math.min(CV_WIDTH, CV_HEIGHT) * Math.cos(angleToCenter + torad(gen.fg_repeat_direction_vat)) / (fgRepeatCountP - 1.001),
			Number(gen.fg_repeat_direction_vas) * Math.min(CV_WIDTH, CV_HEIGHT) * Math.sin(angleToCenter + torad(gen.fg_repeat_direction_vat)) / (fgRepeatCountP - 1.001)
		];
		let fgRepeatVectorQ = [
			Number(gen.fg_repeat_direction_vbx) * Math.min(CV_WIDTH, CV_HEIGHT) * Math.cos(angleToCenter + torad(gen.fg_repeat_direction_vby)) / (fgRepeatCountQ - 1.001),
			Number(gen.fg_repeat_direction_vbx) * Math.min(CV_WIDTH, CV_HEIGHT) * Math.sin(angleToCenter + torad(gen.fg_repeat_direction_vby)) / (fgRepeatCountQ - 1.001)
		];


		let fgRepeatRotateOrigin = torad(gen.fg_repeat_rotate_origin);
		let fgRepeatRotate = [torad(gen.fg_repeat_rotate_va), torad(gen.fg_repeat_rotate_vb)];


		let fgRepeatResize = [Number(gen.fg_repeat_changeA_size), Number(gen.fg_repeat_changeB_size)];

		// 図形の大まかなサイズから、繰り返しの拡大縮小を調整する。
		let shapeSize
		= (Math.max(Number(gen.fg_size_x0), Number(gen.fg_size_x1), Number(gen.fg_size_x2), 0) 
		- Math.min(Number(gen.fg_size_x0), Number(gen.fg_size_x1), Number(gen.fg_size_x2), 0)) * 0.5
		+ (Math.max(Number(gen.fg_size_y0), Number(gen.fg_size_y1), Number(gen.fg_size_y2), 0) 
		- Math.min(Number(gen.fg_size_y0), Number(gen.fg_size_y1), Number(gen.fg_size_y2), 0)) * 0.5;

		gen._calculated.shapeSize = shapeSize;
		
		/* ========================
		繰り返しサイズ変化の調整
		元の図形が大きければ大きいほど、縮小しやすくなる
		図形サイズが0のとき、サイズ変化は -0.5～1 の値をとる
		図形サイズが2のとき、サイズ変化は -1  ～0 の値をとる
		======================== */
		
		fgRepeatResize[0] = 0.125 * (2 - 3 * shapeSize + (6 - shapeSize) * fgRepeatResize[0]);
		fgRepeatResize[1] = 0.125 * (2 - 3 * shapeSize + (6 - shapeSize) * fgRepeatResize[1]);
		gen._calculated.fgRepeatResizeP = fgRepeatResize[0];
		gen._calculated.fgRepeatResizeQ = fgRepeatResize[1];

		let fgRepeatChangeColorAHue = Number(gen.fg_repeat_changeA_hue);
		let fgRepeatChangeColorASaturation = Number(gen.fg_repeat_changeA_saturation);
		let fgRepeatChangeColorALightness = Number(gen.fg_repeat_changeA_lightness);
		let fgRepeatChangeColorBHue = Number(gen.fg_repeat_changeB_hue);
		let fgRepeatChangeColorBSaturation = Number(gen.fg_repeat_changeB_saturation);
		let fgRepeatChangeColorBLightness = Number(gen.fg_repeat_changeB_lightness);
		ctx.strokeStyle = fgStrokeColor;

		
		gen._calculated.fgRepeatChangeColorPHue = fgRepeatChangeColorAHue * fgRepeatCountP + fgFillColorHue;
		gen._calculated.fgRepeatChangeColorPSaturation = fgRepeatChangeColorASaturation * fgRepeatCountP + fgFillColorSaturation;
		gen._calculated.fgRepeatChangeColorPLightness = fgRepeatChangeColorALightness * fgRepeatCountP + fgFillColorLightness;
		gen._calculated.fgRepeatChangeColorQHue = fgRepeatChangeColorBHue * fgRepeatCountQ + fgFillColorHue;
		gen._calculated.fgRepeatChangeColorQSaturation = fgRepeatChangeColorBSaturation * fgRepeatCountQ + fgFillColorSaturation;
		gen._calculated.fgRepeatChangeColorQLightness = fgRepeatChangeColorBLightness * fgRepeatCountQ + fgFillColorLightness;
		
		/* ========================
		| | 繰り返しの適用
		======================== */

		let fgShapeType = gen.fg_type;
		for (let i = 0; i < fgRepeatCountP; i++) {
			for(let j = 0; j < fgRepeatCountQ; j++) {
				let drawShapeCenterX = fgShapeOriginX + i * fgRepeatVectorP[0] + j * fgRepeatVectorQ[0];
				let drawShapeCenterY = fgShapeOriginY + i * fgRepeatVectorP[1] + j * fgRepeatVectorQ[1];
				let drawShapeRotate = fgRepeatRotateOrigin + i * fgRepeatRotate[0] + j * fgRepeatRotate[1];
				let drawShapeSize = [
					fgShapeVertex[0][0] * (1 + i * fgRepeatResize[0]) * (1 + j * fgRepeatResize[1]),
					fgShapeVertex[0][1] * (1 + i * fgRepeatResize[0]) * (1 + j * fgRepeatResize[1])
				];
				let tmpVertex = [
					[fgShapeVertex[0][0] * (1 + i * fgRepeatResize[0]) * (1 + j * fgRepeatResize[1]), fgShapeVertex[0][1] * (1 + i * fgRepeatResize[0]) * (1 + j * fgRepeatResize[1])],
					[fgShapeVertex[1][0] * (1 + i * fgRepeatResize[0]) * (1 + j * fgRepeatResize[1]), fgShapeVertex[1][1] * (1 + i * fgRepeatResize[0]) * (1 + j * fgRepeatResize[1])],
					[fgShapeVertex[2][0] * (1 + i * fgRepeatResize[0]) * (1 + j * fgRepeatResize[1]), fgShapeVertex[2][1] * (1 + i * fgRepeatResize[0]) * (1 + j * fgRepeatResize[1])]
				];
				// 回転: X = xcos(theta) - ysin(theta), Y = xsin(theta) + ycos(theta)
				let drawShapeVertex = [
					[drawShapeCenterX + tmpVertex[0][0] * Math.cos(drawShapeRotate) - tmpVertex[0][1] * Math.sin(drawShapeRotate), drawShapeCenterY + tmpVertex[0][0] * 1 * Math.sin(drawShapeRotate) + tmpVertex[0][1] * Math.cos(drawShapeRotate)],
					[drawShapeCenterX + tmpVertex[1][0] * Math.cos(drawShapeRotate) - tmpVertex[1][1] * Math.sin(drawShapeRotate), drawShapeCenterY + tmpVertex[1][0] * 1 * Math.sin(drawShapeRotate) + tmpVertex[1][1] * Math.cos(drawShapeRotate)],
					[drawShapeCenterX + tmpVertex[2][0] * Math.cos(drawShapeRotate) - tmpVertex[2][1] * Math.sin(drawShapeRotate), drawShapeCenterY + tmpVertex[2][0] * 1 * Math.sin(drawShapeRotate) + tmpVertex[2][1] * Math.cos(drawShapeRotate)]
				];
				let drawShapeFillHue = fgFillColorHue + i * fgRepeatChangeColorAHue + j * fgRepeatChangeColorBHue;
				let drawShapeFillSaturation = fgFillColorSaturation + i * fgRepeatChangeColorASaturation + j * fgRepeatChangeColorBSaturation;
				let drawShapeFillLightness = fgFillColorLightness + i * fgRepeatChangeColorALightness + j * fgRepeatChangeColorBLightness;
				let drawShapeFill = `hsla(${drawShapeFillHue} ${drawShapeFillSaturation}% ${drawShapeFillLightness}% / ${fgFillColorAlpha}%)`;

				ctx.fillStyle = drawShapeFill;
				ctx.lineWidth = fgStrokeWidth;
				ctx.moveTo(drawShapeCenterX, drawShapeCenterY);
				ctx.beginPath();


				if(fgShapeType == 'circle') {
					// // 円
					ctx.arc(drawShapeCenterX, drawShapeCenterY, Math.abs(drawShapeSize[0]), 0, 2 * Math.PI);
				}else if(fgShapeType == 'ellipse') {
					// // 楕円
					ctx.ellipse(drawShapeCenterX, drawShapeCenterY, Math.abs(drawShapeSize[0]), Math.abs(drawShapeSize[1]), drawShapeRotate, 0, 2 * Math.PI);
				}else if(fgShapeType == 'triangle') {
					// // 三角形
					ctx.lineTo(drawShapeVertex[0][0], drawShapeVertex[0][1]);
					ctx.lineTo(drawShapeVertex[1][0], drawShapeVertex[1][1]);
					ctx.lineTo(drawShapeCenterX, drawShapeCenterY);
					ctx.closePath();

				}else if(fgShapeType == 'square') {
					// // 四角形
					ctx.lineTo(drawShapeVertex[0][0], drawShapeVertex[0][1]);
					ctx.lineTo(drawShapeVertex[1][0], drawShapeVertex[1][1]);
					ctx.lineTo(drawShapeVertex[2][0], drawShapeVertex[2][1]);
					ctx.lineTo(drawShapeCenterX, drawShapeCenterY);
					ctx.closePath();
		
				}else {
					console.error('draw: gen.fg_type が無効な値です');
				}

				ctx.fill();
				ctx.stroke();
			}
		}
	}

	// 弧度法に変換
	function torad(deg) {
		return deg / 180 * Math.PI;
	}
}

// 2点間の距離
// 引数p1, p2は数値配列であること。
// 次元は配列長が短い方に合わせられる。
export function distance(p1, p2) {
	let size = Math.min(p1.length, p2.length);
	let sum = 0;
	for (let i = 0; i < size; i++) {
		sum += (p1[i] - p2[i]) * (p1[i] - p2[i]);
	}
	return Math.sqrt(sum);
}

