export default function drawCanvas(canvas, gen = new Object(), camera = { x: 0, y: 0, zoom: 1.0 }, test = false) {
    if(canvas.getContext) {
        let ctx = canvas.getContext('2d');
        const CV_WIDTH = Number(canvas.width);
        const CV_HEIGHT = Number(canvas.height);

        ctx.save();
        ctx.clearRect(0, 0, CV_WIDTH, CV_HEIGHT);

        ctx.translate(CV_WIDTH / 2 + camera.x, CV_HEIGHT / 2 + camera.y);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.rotate(camera.rotation || 0);
        ctx.translate(-CV_WIDTH / 2, -CV_HEIGHT / 2);

        /* ========================
        | 背景の描画
        ======================== */
        let bgOriginX = Number(gen.bgGradient_center_x) * CV_WIDTH + CV_WIDTH / 2;
        let bgOriginY = Number(gen.bgGradient_center_y) * CV_HEIGHT + CV_HEIGHT / 2;
        let waveLen = Number(gen.bgGradient_wave_len) * Math.max(CV_WIDTH, CV_HEIGHT);
        let waveAngleRad = torad(gen.bgGradient_wave_angle);
        
        // ★ 修正：リミッターの Math.max などを全撤廃し、ダイレクトに数値を使う！
        let bgLit0 = Number(gen.bgColor_lightness);
        let bgLit1 = Number(gen.bgGradient_color_lightness);
        let bgColors = [
            `hsl(${gen.bgColor_hue} ${gen.bgColor_saturation}% ${bgLit0}%)`,
            `hsl(${gen.bgGradient_color_hue} ${gen.bgGradient_color_saturation}% ${bgLit1}%)`
        ];
        let bgColorStops = [
            Number(gen.bgGradient_colorStop_0),
            Number(gen.bgGradient_colorStop_1)
        ];
        
        let bgStyle = gen.bgGradient_type;
        if(bgStyle == 'none') {
            ctx.fillStyle = bgColors[0];
        }else if(bgStyle == 'linear') {
            let startCount = 0, endCount = 1, dist = 0;
            while(1) {
                dist = distance([CV_WIDTH/2,CV_HEIGHT/2],[(bgOriginX+startCount*waveLen*Math.cos(waveAngleRad)),(bgOriginY+startCount*waveLen*Math.sin(waveAngleRad))]);
                if(dist > distance([0,0],[CV_WIDTH,CV_HEIGHT])*2.5){startCount--;break;}
                startCount--;
            }
            while(1) {
                dist = distance([CV_WIDTH/2,CV_HEIGHT/2],[(bgOriginX+endCount*waveLen*Math.cos(waveAngleRad)),(bgOriginY+endCount*waveLen*Math.sin(waveAngleRad))]);
                if(dist > distance([0,0],[CV_WIDTH,CV_HEIGHT])*2.5){endCount++;break;}
                endCount++;
            }
            let sectionCount = endCount - startCount;
            let lineargradient = ctx.createLinearGradient(bgOriginX+startCount*waveLen*Math.cos(waveAngleRad),bgOriginY+startCount*waveLen*Math.sin(waveAngleRad),bgOriginX+endCount*waveLen*Math.cos(waveAngleRad),bgOriginY+endCount*waveLen*Math.sin(waveAngleRad));
            for(let i=startCount;i<endCount;i++){
                let lc=i-startCount;
                if(i%2==0){lineargradient.addColorStop(lc/sectionCount,bgColors[0]);lineargradient.addColorStop((lc+bgColorStops[0])/sectionCount,bgColors[0]);lineargradient.addColorStop((lc+bgColorStops[1])/sectionCount,bgColors[1]);lineargradient.addColorStop((lc+1)/sectionCount,bgColors[1]);}
                else{lineargradient.addColorStop(lc/sectionCount,bgColors[1]);lineargradient.addColorStop((lc+1-bgColorStops[1])/sectionCount,bgColors[1]);lineargradient.addColorStop((lc+1-bgColorStops[0])/sectionCount,bgColors[0]);lineargradient.addColorStop((lc+1)/sectionCount,bgColors[0]);}
            }
            ctx.fillStyle = lineargradient;
        }else if(bgStyle == 'radial') {
            let endCount=1,dist=0;
            while(1){dist=distance([CV_WIDTH/2,CV_HEIGHT/2],[(bgOriginX+endCount*waveLen*Math.cos(waveAngleRad)),(bgOriginY+endCount*waveLen*Math.sin(waveAngleRad))]);if(dist>distance([0,0],[CV_WIDTH,CV_HEIGHT])*4.3){endCount++;break;}endCount++;}
            let radialgradient=ctx.createRadialGradient(bgOriginX,bgOriginY,0,bgOriginX,bgOriginY,waveLen*endCount);
            let phase=Number(gen.bgGradient_wave_angle)/180;
            for(let i=0;i<endCount;i++){
                if(i%2==0){radialgradient.addColorStop(Math.max(0,i-phase)/endCount,bgColors[0]);radialgradient.addColorStop(Math.max(0,i-phase+bgColorStops[0])/endCount,bgColors[0]);radialgradient.addColorStop(Math.max(0,i-phase+bgColorStops[1])/endCount,bgColors[1]);radialgradient.addColorStop(Math.max(0,i-phase+1)/endCount,bgColors[1]);}
                else{radialgradient.addColorStop(Math.max(0,i-phase)/endCount,bgColors[1]);radialgradient.addColorStop(Math.max(0,i-phase+1-bgColorStops[1])/endCount,bgColors[1]);radialgradient.addColorStop(Math.max(0,i-phase+1-bgColorStops[0])/endCount,bgColors[0]);radialgradient.addColorStop(Math.max(0,i-phase+1)/endCount,bgColors[0]);}
            }
            ctx.fillStyle = radialgradient;
        }else if(bgStyle == 'conic') {
            let endCount=2/Number(gen.bgGradient_wave_len);
            let conicgradient=ctx.createConicGradient(waveAngleRad,bgOriginX,bgOriginY);
            for(let i=0;i<endCount;i++){
                if(i%2==0){conicgradient.addColorStop(Math.min(endCount,i)/endCount,bgColors[0]);conicgradient.addColorStop(Math.min(endCount,i+bgColorStops[0])/endCount,bgColors[0]);conicgradient.addColorStop(Math.min(endCount,i+bgColorStops[1])/endCount,bgColors[1]);conicgradient.addColorStop(Math.min(endCount,i+1)/endCount,bgColors[1]);}
                else{conicgradient.addColorStop(Math.min(endCount,i)/endCount,bgColors[1]);conicgradient.addColorStop(Math.min(endCount,i+1-bgColorStops[1])/endCount,bgColors[1]);conicgradient.addColorStop(Math.min(endCount,i+1-bgColorStops[0])/endCount,bgColors[0]);conicgradient.addColorStop(Math.min(endCount,i+1)/endCount,bgColors[0]);}
            }
            ctx.fillStyle = conicgradient;
        }
        ctx.fillRect(0,0,CV_WIDTH,CV_HEIGHT);

        let fgPatternType = gen.fg_pattern || 'none';
        let fgShapeType   = gen.fg_type || 'circle';
        let fgShapeType2  = gen.fg_type2 || null;

        let fgShapeOriginX = Number(gen.fg_repeat_origin_x)*CV_WIDTH+CV_WIDTH/2;
        let fgShapeOriginY = Number(gen.fg_repeat_origin_y)*CV_HEIGHT+CV_HEIGHT/2;
        
        const BASE_SCALE = 0.5; 
        let fgShapeVertex = [
            [Number(gen.fg_size_x0)*CV_WIDTH*BASE_SCALE, Number(gen.fg_size_y0)*CV_HEIGHT*BASE_SCALE],
            [Number(gen.fg_size_x1)*CV_WIDTH*BASE_SCALE, Number(gen.fg_size_y1)*CV_HEIGHT*BASE_SCALE],
            [Number(gen.fg_size_x2)*CV_WIDTH*BASE_SCALE, Number(gen.fg_size_y2)*CV_HEIGHT*BASE_SCALE]
        ];

        gen._calculated = new Object();
        let fgFillColorHue = Number(gen.fg_fill_hue);
        let fgFillColorSaturation = Number(gen.fg_fill_saturation);
        
        // ★ 修正：リミッターの Math.min や Math.max を全撤廃！
        let fgFillColorLightness = Number(gen.fg_fill_lightness); 
        
        let fgFillColorAlpha = Number(gen.fg_fill_alpha);
        let fgStrokeWidth = Number(gen.fg_stroke_width);
        const fgStrokeColorHue = Number(gen.fg_stroke_color_hue)+fgFillColorHue;
        const fgStrokeColorSaturation = Number(gen.fg_stroke_color_saturation)+fgFillColorSaturation;
        const fgStrokeColorLightness = Number(gen.fg_stroke_color_lightness)+fgFillColorLightness;
        const fgStrokeColorAlpha = Number(gen.fg_stroke_color_alpha);
        let fgStrokeColor = `hsla(${fgStrokeColorHue} ${fgStrokeColorSaturation}% ${fgStrokeColorLightness}% / ${fgStrokeColorAlpha}%)`;
        gen._calculated.fgStrokeColorHue = fgStrokeColorHue;
        gen._calculated.fgStrokeColorSaturation = fgStrokeColorSaturation;
        gen._calculated.fgStrokeColorLightness = fgStrokeColorLightness;
        gen._calculated.fgStrokeColorAlpha = fgStrokeColorAlpha;
        
        let fgRepeatCountP = Number(gen.fg_repeat_count_va);
        let fgRepeatCountQ = Number(gen.fg_repeat_count_vb);
        let angleToCenter = 0;
        if(fgShapeOriginX==CV_WIDTH/2){if(fgShapeOriginY>=0)angleToCenter=Math.PI/2;else angleToCenter=-1*Math.PI/2;}
        else{angleToCenter=Math.atan(Number(gen.fg_repeat_origin_y)/Number(gen.fg_repeat_origin_x));if(fgShapeOriginX>CV_WIDTH/2)angleToCenter+=Math.PI;}
        
        let fgRepeatVectorP=[Number(gen.fg_repeat_direction_vas)*Math.min(CV_WIDTH,CV_HEIGHT)*Math.cos(angleToCenter+torad(gen.fg_repeat_direction_vat))/(fgRepeatCountP-1.001),Number(gen.fg_repeat_direction_vas)*Math.min(CV_WIDTH,CV_HEIGHT)*Math.sin(angleToCenter+torad(gen.fg_repeat_direction_vat))/(fgRepeatCountP-1.001)];
        let fgRepeatVectorQ=[Number(gen.fg_repeat_direction_vbx)*Math.min(CV_WIDTH,CV_HEIGHT)*Math.cos(angleToCenter+torad(gen.fg_repeat_direction_vby))/(fgRepeatCountQ-1.001),Number(gen.fg_repeat_direction_vbx)*Math.min(CV_WIDTH,CV_HEIGHT)*Math.sin(angleToCenter+torad(gen.fg_repeat_direction_vby))/(fgRepeatCountQ-1.001)];
        let fgRepeatRotateOrigin=torad(gen.fg_repeat_rotate_origin);
        let fgRepeatRotate=[torad(gen.fg_repeat_rotate_va),torad(gen.fg_repeat_rotate_vb)];
        let fgRepeatResize=[Number(gen.fg_repeat_changeA_size),Number(gen.fg_repeat_changeB_size)];
        
        let shapeSize=(Math.max(Number(gen.fg_size_x0),Number(gen.fg_size_x1),Number(gen.fg_size_x2),0)-Math.min(Number(gen.fg_size_x0),Number(gen.fg_size_x1),Number(gen.fg_size_x2),0))*0.5+(Math.max(Number(gen.fg_size_y0),Number(gen.fg_size_y1),Number(gen.fg_size_y2),0)-Math.min(Number(gen.fg_size_y0),Number(gen.fg_size_y1),Number(gen.fg_size_y2),0))*0.5;
        gen._calculated.shapeSize = shapeSize;
        fgRepeatResize[0]=0.125*(2-3*shapeSize+(6-shapeSize)*fgRepeatResize[0]);
        fgRepeatResize[1]=0.125*(2-3*shapeSize+(6-shapeSize)*fgRepeatResize[1]);
        gen._calculated.fgRepeatResizeP=fgRepeatResize[0];
        gen._calculated.fgRepeatResizeQ=fgRepeatResize[1];
        
        let fgRepeatChangeColorAHue=Number(gen.fg_repeat_changeA_hue)||0;
        let fgRepeatChangeColorASaturation=Number(gen.fg_repeat_changeA_saturation)||0;
        let fgRepeatChangeColorALightness=Number(gen.fg_repeat_changeA_lightness)||0;
        let fgRepeatChangeColorBHue=Number(gen.fg_repeat_changeB_hue)||0;
        let fgRepeatChangeColorBSaturation=Number(gen.fg_repeat_changeB_saturation)||0;
        let fgRepeatChangeColorBLightness=Number(gen.fg_repeat_changeB_lightness)||0;

        if (fgPatternType !== 'none') {

            const normalizedCellSize = (Number(gen.fg_size_x0) + 1) / 2;
            const baseSize = Math.max(CV_WIDTH, CV_HEIGHT);
            const minSize = baseSize * 0.05; 
            const cellSize = Math.max(minSize, normalizedCellSize * baseSize * 0.4);
            const normalizedThickness = (Number(gen.fg_size_y0) + 1) / 2;
            const patternAngle = fgRepeatRotateOrigin;

            const colorA = bgColors[0];
            
            const colorBHue = fgFillColorHue + fgRepeatChangeColorAHue * 30;
            const colorBSat = Math.max(0, Math.min(100, fgFillColorSaturation + fgRepeatChangeColorASaturation * 10));
            const colorBLit = Math.max(0, Math.min(100, fgFillColorLightness + fgRepeatChangeColorALightness * 10));
            
            let colorB;
            if (gen._absolute_colorB) {
                colorB = gen._absolute_colorB;
            } else {
                colorB = `hsla(${colorBHue} ${colorBSat}% ${colorBLit}% / ${fgFillColorAlpha}%)`;
            }
            
            const colorCHue = fgFillColorHue + fgRepeatChangeColorBHue * 60;
            const colorCSat = Math.max(0, Math.min(100, fgFillColorSaturation + fgRepeatChangeColorBSaturation * 10));
            const colorCLit = Math.max(0, Math.min(100, fgFillColorLightness + fgRepeatChangeColorBLightness * 10));
            const colorC = `hsla(${colorCHue} ${colorCSat}% ${colorCLit}% / ${fgFillColorAlpha}%)`;

            const patCanvas = document.createElement('canvas');
            const patCtx = patCanvas.getContext('2d');
            const cs = Math.max(4, Math.round(cellSize));

            fgStrokeWidth = 0;
            ctx.strokeStyle = 'transparent';

            if (fgPatternType === 'dot') {
                const dotRatio = Math.min(0.48, Math.max(0.05, normalizedThickness * 0.5));
                patCanvas.width = patCanvas.height = cs;
                patCtx.fillStyle = colorA;
                patCtx.fillRect(0, 0, cs, cs);
                patCtx.beginPath();
                patCtx.arc(cs/2, cs/2, cs * dotRatio, 0, 2*Math.PI);
                patCtx.fillStyle = colorB;
                patCtx.fill();

            } else if (fgPatternType === 'showerdot') {
                const dotRatio = Math.min(0.25, Math.max(0.02, normalizedThickness * 0.25));
                const w = cs * 3;
                patCanvas.width = patCanvas.height = w;
                patCtx.fillStyle = colorA;
                patCtx.fillRect(0, 0, w, w);
                patCtx.fillStyle = colorB;
                
                let seedS = Math.abs((Number(gen.fg_size_x0)||0)*123.4 + (Number(gen.fg_size_y0)||0)*567.8 + (Number(gen.bgColor_hue)||0));
                const randS = () => { let x = Math.sin(seedS++) * 10000; return x - Math.floor(x); };
                
                for(let i=0; i<30; i++){
                    let px = randS();
                    let py = randS();
                    let pr = 0.2 + randS() * 0.6; 
                    
                    let cx = w * px;
                    let cy = w * py;
                    let radius = Math.abs(w * dotRatio * pr);

                    for(let dx = -1; dx <= 1; dx++) {
                        for(let dy = -1; dy <= 1; dy++) {
                            patCtx.beginPath(); 
                            patCtx.arc(cx + dx * w, cy + dy * w, radius, 0, 2*Math.PI); 
                            patCtx.fill();
                        }
                    }
                }

            } else if (fgPatternType === 'stripe') {
                const stripeRatio = Math.min(0.95, Math.max(0.05, normalizedThickness));
                patCanvas.width = patCanvas.height = cs;
                patCtx.fillStyle = colorA;
                patCtx.fillRect(0, 0, cs, cs);
                patCtx.fillStyle = colorB;
                patCtx.fillRect(0, 0, cs * stripeRatio, cs);

            // ★追加1：クラスター・ストライプ（複数本の細い線のセット）
            } else if (fgPatternType === 'clusterstripe') {
                const w = cs * 2;
                patCanvas.width = patCanvas.height = w;
                patCtx.fillStyle = colorA;
                patCtx.fillRect(0, 0, w, w);
                
                patCtx.fillStyle = colorB;
                const lineCount = 4; // 1セットあたりの線の数
                const lineWidth = Math.max(1, w * 0.05); // 線の太さ
                const gap = lineWidth * 1.5; // 線と線の間隔
                const setWidth = (lineWidth + gap) * lineCount;
                
                // 1セットのストライプを描画（左寄りに配置）
                for (let i = 0; i < lineCount; i++) {
                    patCtx.fillRect(i * (lineWidth + gap), 0, lineWidth, w);
                }

            // ★追加2：クラブ・ストライプ（印象の強い2〜3色の太い線）
            } else if (fgPatternType === 'clubstripe') {
                const w = cs * 3;
                patCanvas.width = patCanvas.height = w;
                patCtx.fillStyle = colorA;
                patCtx.fillRect(0, 0, w, w);
                
                // 3色のブロックを等間隔で配置
                patCtx.fillStyle = colorB;
                patCtx.fillRect(w * 0.33, 0, w * 0.33, w);
                
                patCtx.fillStyle = colorC;
                patCtx.fillRect(w * 0.66, 0, w * 0.34, w);
                
                // アクセントの細い白線を入れる
                patCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                patCtx.fillRect(w * 0.33 - 2, 0, 4, w);
                patCtx.fillRect(w * 0.66 - 2, 0, 4, w);

            // ★追加3：マルチ・ストライプ（幅や色がバラバラの多数の線）
            } else if (fgPatternType === 'multistripe') {
                const w = cs * 5; // タイルを大きくしてランダム感を出す
                patCanvas.width = patCanvas.height = w;
                patCtx.fillStyle = colorA;
                patCtx.fillRect(0, 0, w, w);
                
                // シード値付きの疑似乱数で、同じパラメータなら常に同じ柄になるようにする
                let seedM = Math.abs((Number(gen.fg_size_x0)||0)*111 + (Number(gen.bgColor_hue)||0)*222);
                const randM = () => { let x = Math.sin(seedM++) * 10000; return x - Math.floor(x); };
                
                const colors = [
                    colorB, colorC, 
                    `hsla(${(fgFillColorHue + 120) % 360} ${colorBSat}% ${colorBLit}% / ${fgFillColorAlpha}%)`, // 補色っぽい色1
                    `hsla(${(fgFillColorHue + 240) % 360} ${colorCSat}% ${colorCLit}% / ${fgFillColorAlpha}%)`  // 補色っぽい色2
                ];
                
                let currentX = 0;
                while (currentX < w) {
                    const lineWidth = w * (0.02 + randM() * 0.1); // 幅をランダムに
                    const color = colors[Math.floor(randM() * colors.length)]; // 色をランダムに選択
                    
                    patCtx.fillStyle = color;
                    patCtx.fillRect(currentX, 0, lineWidth, w);
                    
                    // 次の線までの隙間（詰めるか少し空けるか）
                    currentX += lineWidth + (randM() > 0.7 ? w * 0.02 : 0);
                }

            } else if (fgPatternType === 'checker' || fgPatternType === 'gingham') {
                patCanvas.width = patCanvas.height = cs * 2;
                patCtx.clearRect(0, 0, cs*2, cs*2);
                if (fgPatternType === 'checker') {
                    patCtx.fillStyle = colorA; patCtx.fillRect(0, 0, cs*2, cs*2);
                    patCtx.fillStyle = colorB; patCtx.fillRect(cs, 0, cs, cs); patCtx.fillRect(0, cs, cs, cs);
                } else {
                    patCtx.fillStyle = colorA; patCtx.fillRect(0, 0, cs*2, cs*2);
                    patCtx.globalAlpha = 0.5;
                    patCtx.fillStyle = colorB; patCtx.fillRect(cs, 0, cs, cs*2); patCtx.fillRect(0, cs, cs*2, cs); 
                    patCtx.globalAlpha = 1.0;
                }

            } else if (fgPatternType === 'houndstooth') {
                patCanvas.width = patCanvas.height = cs * 4;
                patCtx.fillStyle = colorA; patCtx.fillRect(0, 0, cs*4, cs*4);
                patCtx.fillStyle = colorB;
                const drawTooth = (x, y) => {
                    patCtx.beginPath(); patCtx.moveTo(x, y); patCtx.lineTo(x+cs, y);
                    patCtx.lineTo(x+cs, y+cs); patCtx.lineTo(x+cs*2, y+cs); patCtx.lineTo(x+cs*2, y+cs*2);
                    patCtx.lineTo(x+cs, y+cs*2); patCtx.lineTo(x+cs, y+cs*3); patCtx.lineTo(x, y+cs*3);
                    patCtx.lineTo(x, y+cs*2); patCtx.lineTo(x-cs, y+cs*2); patCtx.lineTo(x-cs, y+cs);
                    patCtx.lineTo(x, y+cs); patCtx.closePath(); patCtx.fill();
                };
                drawTooth(0, 0); drawTooth(cs*2, cs*2);

            } else if (fgPatternType === 'windowpane') {
                const lineW = Math.max(1, cs * 0.08);
                patCanvas.width = patCanvas.height = cs;
                patCtx.fillStyle = colorA; patCtx.fillRect(0, 0, cs, cs);
                patCtx.fillStyle = colorB; patCtx.fillRect(0, 0, lineW, cs); patCtx.fillRect(0, 0, cs, lineW);

            } else if (fgPatternType === 'argyle') {
                const aw = cs * 2, ah = cs * 4;
                patCanvas.width = aw; patCanvas.height = ah; patCtx.clearRect(0, 0, aw, ah);
                patCtx.fillStyle = colorA; patCtx.fillRect(0, 0, aw, ah);
                const drawDiamond = (cx, cy) => {
                    patCtx.beginPath(); patCtx.moveTo(cx, cy - ah/2); patCtx.lineTo(cx + aw/2, cy); 
                    patCtx.lineTo(cx, cy + ah/2); patCtx.lineTo(cx - aw/2, cy); patCtx.closePath(); patCtx.fill();
                };
                patCtx.fillStyle = colorB; drawDiamond(aw/2, 0); drawDiamond(aw/2, ah);
                
                const colorDLit = Math.max(0, fgFillColorLightness - 30);
                const colorD = `hsla(${colorBHue} ${colorBSat}% ${colorDLit}% / ${fgFillColorAlpha}%)`;
                patCtx.fillStyle = colorD; drawDiamond(aw/2, ah/2); drawDiamond(0, 0); drawDiamond(aw, 0); drawDiamond(0, ah); drawDiamond(aw, ah);
                const stitchLit = Math.max(0, fgFillColorLightness - 50);
                patCtx.strokeStyle = `hsla(${colorCHue} ${colorCSat}% ${stitchLit}% / ${fgFillColorAlpha}%)`;
                patCtx.lineWidth = Math.max(1, cs * 0.08); patCtx.setLineDash([cs * 0.2, cs * 0.2]); 
                patCtx.beginPath(); patCtx.moveTo(0, ah/2); patCtx.lineTo(aw/2, 0); patCtx.lineTo(aw, ah/2); patCtx.lineTo(aw/2, ah); patCtx.closePath(); patCtx.stroke();
                patCtx.setLineDash([]);

            } else if (fgPatternType === 'tartan') {
                const w = cs * 4; patCanvas.width = patCanvas.height = w;
                patCtx.fillStyle = colorA; patCtx.fillRect(0, 0, w, w);
                patCtx.globalAlpha = 0.5; patCtx.fillStyle = colorB; patCtx.fillRect(0, 0, cs*1.5, w); patCtx.fillRect(0, 0, w, cs*1.5);
                patCtx.fillStyle = colorC; const lineW = Math.max(1, cs * 0.2); patCtx.fillRect(cs*2.5, 0, lineW, w); patCtx.fillRect(0, cs*2.5, w, lineW);
                patCtx.globalAlpha = 1.0;

            } else if (fgPatternType === 'madras') {
                const w = cs * 4; patCanvas.width = patCanvas.height = w; patCtx.clearRect(0, 0, w, w);
                patCtx.fillStyle = colorA; patCtx.fillRect(0, 0, w, w);
                const stripes = [0.1, 0.25, 0.08, 0.2, 0.12, 0.18, 0.07]; let pos = 0;
                const colors = [colorB, colorA, colorC, colorB, colorA, colorC, colorB];
                stripes.forEach((ratio, i) => {
                    const sw = w * ratio; patCtx.globalAlpha = 0.7; patCtx.fillStyle = colors[i % colors.length];
                    patCtx.fillRect(pos, 0, sw, w); patCtx.fillRect(0, pos, w, sw); pos += sw;
                });
                patCtx.globalAlpha = 1.0;

            } else if (fgPatternType === 'cloud') {
                const fw = Math.max(CV_WIDTH, CV_HEIGHT); patCanvas.width = CV_WIDTH; patCanvas.height = CV_HEIGHT; patCtx.clearRect(0, 0, fw, fw);
                patCtx.fillStyle = `hsl(${fgFillColorHue} 20% 97%)`; patCtx.fillRect(0, 0, fw, fw);
                const alphaValue = Math.min(1, fgFillColorAlpha / 100); const sat = Math.max(40, fgFillColorSaturation);
                patCtx.filter = `blur(${Math.max(1, fw * 0.015)}px)`;
                const bubbles = [
                    { rx: 0.12, ry: 0.15, r: 0.12, dh: 0 }, { rx: 0.45, ry: 0.10, r: 0.16, dh: 60 }, { rx: 0.80, ry: 0.18, r: 0.11, dh: 200 },
                    { rx: 0.22, ry: 0.48, r: 0.14, dh: 270 }, { rx: 0.60, ry: 0.42, r: 0.18, dh: 40 }, { rx: 0.88, ry: 0.55, r: 0.13, dh: 180 },
                    { rx: 0.10, ry: 0.80, r: 0.15, dh: 120 }, { rx: 0.45, ry: 0.75, r: 0.13, dh: 300 }, { rx: 0.78, ry: 0.82, r: 0.16, dh: 80 },
                    { rx: 0.32, ry: 0.28, r: 0.09, dh: 240 }, { rx: 0.68, ry: 0.22, r: 0.10, dh: 160 }, { rx: 0.55, ry: 0.62, r: 0.08, dh: 20 }, { rx: 0.18, ry: 0.65, r: 0.10, dh: 320 }
                ];
                bubbles.forEach(b => {
                    const bx = b.rx * fw, by = b.ry * fw, br = Math.max(3, b.r * fw * (0.5 + normalizedThickness)), hue = (fgFillColorHue + b.dh) % 360;
                    const grad = patCtx.createRadialGradient(bx, by, 0, bx, by, br);
                    grad.addColorStop(0, `hsla(${hue}, ${sat}%, 75%, ${alphaValue})`); grad.addColorStop(0.5, `hsla(${hue}, ${sat}%, 75%, ${alphaValue * 0.6})`);
                    grad.addColorStop(0.85,`hsla(${hue}, ${sat}%, 75%, ${alphaValue * 0.15})`); grad.addColorStop(1, `hsla(${hue}, ${sat}%, 75%, 0)`);
                    patCtx.fillStyle = grad; patCtx.beginPath(); patCtx.arc(bx, by, br, 0, Math.PI * 2); patCtx.fill();
                });
                patCtx.filter = 'none';

            } else if (fgPatternType === 'neon') {
                const fw = Math.max(CV_WIDTH, CV_HEIGHT); patCanvas.width = CV_WIDTH; patCanvas.height = CV_HEIGHT; patCtx.clearRect(0, 0, fw, fw);
                patCtx.fillStyle = `hsl(${fgFillColorHue} 20% 5%)`; patCtx.fillRect(0, 0, fw, fw);
                const lineThickness = Math.max(1, fw * normalizedThickness * 0.05), glowSize = lineThickness * 6;
                const drawNeonLine = (x1, y1, x2, y2, hue, sat, lit) => {
                    patCtx.shadowColor = `hsla(${hue}, ${sat}%, ${lit}%, 0.8)`; patCtx.shadowBlur = glowSize * 2; patCtx.strokeStyle = `hsla(${hue}, ${sat}%, ${lit}%, 0.4)`; patCtx.lineWidth = lineThickness * 3; patCtx.beginPath(); patCtx.moveTo(x1, y1); patCtx.lineTo(x2, y2); patCtx.stroke();
                    patCtx.shadowBlur = glowSize; patCtx.strokeStyle = `hsla(${hue}, ${sat}%, ${lit}%, 0.7)`; patCtx.lineWidth = lineThickness * 1.5; patCtx.beginPath(); patCtx.moveTo(x1, y1); patCtx.lineTo(x2, y2); patCtx.stroke();
                    patCtx.shadowBlur = glowSize * 0.5; patCtx.strokeStyle = `hsla(${hue}, ${sat}%, 90%, 1)`; patCtx.lineWidth = lineThickness * 0.5; patCtx.beginPath(); patCtx.moveTo(x1, y1); patCtx.lineTo(x2, y2); patCtx.stroke();
                };
                patCtx.lineCap = 'round';
                const originOffsetX = (Number(gen.fg_repeat_origin_x) + 0.6) / 1.2, originOffsetY = (Number(gen.fg_repeat_origin_y) + 0.6) / 1.2, lineCount = Math.max(1, Math.min(5, Math.round(fgRepeatCountP / 4))), angleRad = fgRepeatRotateOrigin; 
                const hueB = (fgFillColorHue + fgRepeatChangeColorAHue * 30 + 60) % 360, hueC = (fgFillColorHue + fgRepeatChangeColorBHue * 60 + 150) % 360, sat = Math.max(80, fgFillColorSaturation), lit = Math.max(60, fgFillColorLightness);
                const dx = Math.cos(angleRad) * fw * 2, dy = Math.sin(angleRad) * fw * 2, cx0 = fw * originOffsetX, cy0 = fw * originOffsetY;
                drawNeonLine(cx0 - dx, cy0 - dy, cx0 + dx, cy0 + dy, fgFillColorHue, sat, lit);
                const vx = fw * ((originOffsetX + 0.3) % 1.0); drawNeonLine(vx, 0, vx, fw, hueB, sat, lit);
                if (lineCount >= 2) { const hy = fw * ((originOffsetY + 0.4) % 1.0); drawNeonLine(0, hy, fw, hy, hueC, sat, lit); }
                if (lineCount >= 3) { const dx2 = Math.cos(angleRad + Math.PI / 3) * fw * 2, dy2 = Math.sin(angleRad + Math.PI / 3) * fw * 2, cx2 = fw * ((originOffsetX + 0.5) % 1.0), cy2 = fw * ((originOffsetY + 0.5) % 1.0); drawNeonLine(cx2 - dx2, cy2 - dy2, cx2 + dx2, cy2 + dy2, hueB, sat, lit); }
                patCtx.shadowBlur = 0;
            
            } else if (fgPatternType === 'wave') {
                const w = cs * 4;
                patCanvas.width = patCanvas.height = w;
                patCtx.fillStyle = colorA; 
                patCtx.fillRect(0, 0, w, w);
                
                patCtx.strokeStyle = colorB;
                patCtx.lineWidth = Math.max(2, cs * 0.3);
                patCtx.lineCap = 'round';
                patCtx.lineJoin = 'round';
                
                const waveCount = 2;
                const amp = cs * 0.5;
                const yStep = cs;
                
                for (let y = -yStep; y <= w + yStep; y += yStep) {
                    patCtx.beginPath();
                    for (let x = -cs; x <= w + cs; x += 1) {
                        const waveY = Math.sin((x / w) * Math.PI * 2 * waveCount) * amp;
                        if (x === -cs) patCtx.moveTo(x, y + waveY);
                        else patCtx.lineTo(x, y + waveY);
                    }
                    patCtx.stroke();
                }

            } else if (fgPatternType === 'karakusa') {
                // ★ 追加：唐草模様（アラベスク）の描画ロジック
                const w = cs * 4;
                patCanvas.width = patCanvas.height = w;
                patCtx.fillStyle = colorA;
                patCtx.fillRect(0, 0, w, w);
                
                patCtx.strokeStyle = colorB;
                patCtx.fillStyle = colorB;
                patCtx.lineWidth = Math.max(1.5, cs * 0.15);
                patCtx.lineCap = 'round';
                patCtx.lineJoin = 'round';
                
                const step = w / 2;
                
                // くるくる（蔓）を描く関数
                const drawVine = (cx, cy, radius, startAngle, isReverse) => {
                    patCtx.beginPath();
                    for (let i = 0; i <= 30; i++) {
                        let progress = i / 30;
                        let currentAngle = startAngle + (isReverse ? -1 : 1) * progress * Math.PI * 3; // 1.5回転
                        let currentRadius = radius * (1 - progress);
                        let px = cx + Math.cos(currentAngle) * currentRadius;
                        let py = cy + Math.sin(currentAngle) * currentRadius;
                        if (i === 0) patCtx.moveTo(px, py);
                        else patCtx.lineTo(px, py);
                    }
                    patCtx.stroke();
                    
                    // 葉っぱの装飾
                    patCtx.beginPath();
                    let leafAngle = startAngle + (isReverse ? -1 : 1) * Math.PI * 0.8;
                    patCtx.ellipse(
                        cx + Math.cos(leafAngle) * radius * 0.8, 
                        cy + Math.sin(leafAngle) * radius * 0.8, 
                        radius * 0.4, radius * 0.2, 
                        leafAngle, 0, Math.PI * 2
                    );
                    patCtx.fill();
                };

                // タイル状に敷き詰める（はみ出しを考慮して -step から w+step まで）
                for (let x = -step; x <= w + step; x += step) {
                    for (let y = -step; y <= w + step; y += step) {
                        let isEven = Math.abs((x / step) + (y / step)) % 2 === 0;
                        let angleOffset = isEven ? 0 : Math.PI;
                        drawVine(x, y, step * 0.6, angleOffset, isEven);
                        
                        // 蔓同士をつなぐS字カーブ
                        if (x < w + step) {
                            patCtx.beginPath();
                            patCtx.moveTo(x, y);
                            patCtx.bezierCurveTo(x + step * 0.5, y + step * 0.2, x + step * 0.5, y - step * 0.2, x + step, y);
                            patCtx.stroke();
                        }
                    }
                }

            } else if (fgPatternType === 'kirakira') {
                const fw = Math.max(CV_WIDTH, CV_HEIGHT);
                patCanvas.width = CV_WIDTH; 
                patCanvas.height = CV_HEIGHT;
                patCtx.clearRect(0, 0, fw, fw);

                patCtx.fillStyle = colorA;
                patCtx.fillRect(0, 0, fw, fw);

                let seedK = Math.abs((Number(gen.fg_size_x0)||0)*123.4 + (Number(gen.fg_size_y0)||0)*567.8 + (Number(gen.bgColor_hue)||0));
                const randK = () => { let x = Math.sin(seedK++) * 10000; return x - Math.floor(x); };

                patCtx.globalAlpha = 0.6;
                patCtx.filter = `blur(${Math.max(1, fw * 0.1)}px)`;

                patCtx.fillStyle = colorB;
                patCtx.beginPath(); patCtx.arc(fw*(0.1+randK()*0.3), fw*(0.1+randK()*0.3), Math.abs(fw*(0.4+randK()*0.3)), 0, Math.PI*2); patCtx.fill();
                patCtx.beginPath(); patCtx.arc(fw*(0.6+randK()*0.3), fw*(0.6+randK()*0.3), Math.abs(fw*(0.4+randK()*0.3)), 0, Math.PI*2); patCtx.fill();

                patCtx.fillStyle = colorC;
                patCtx.beginPath(); patCtx.arc(fw*(0.6+randK()*0.3), fw*(0.1+randK()*0.3), Math.abs(fw*(0.4+randK()*0.3)), 0, Math.PI*2); patCtx.fill();
                patCtx.beginPath(); patCtx.arc(fw*(0.1+randK()*0.3), fw*(0.6+randK()*0.3), Math.abs(fw*(0.4+randK()*0.3)), 0, Math.PI*2); patCtx.fill();
                
                patCtx.filter = 'none';
                patCtx.globalAlpha = 1.0;

                const drawSparkle = (x, y, size) => {
                    patCtx.save();
                    patCtx.translate(fw*x, fw*y);
                    patCtx.fillStyle = '#ffffff';
                    patCtx.shadowColor = '#ffffff';
                    patCtx.shadowBlur = Math.abs(size * 3);
                    
                    patCtx.beginPath(); patCtx.arc(0, 0, Math.abs(size), 0, Math.PI*2); patCtx.fill();
                    patCtx.beginPath(); patCtx.ellipse(0, 0, Math.abs(size*6), Math.abs(size*0.5), 0, 0, Math.PI*2); patCtx.fill();
                    patCtx.beginPath(); patCtx.ellipse(0, 0, Math.abs(size*0.5), Math.abs(size*6), 0, 0, Math.PI*2); patCtx.fill();
                    patCtx.restore();
                };

                let numSparkles = 5 + Math.floor(randK() * 5); // 5〜9個
                for(let i=0; i < numSparkles; i++){
                    drawSparkle(randK(), randK(), fw*(0.003 + randK()*0.004));
                }

                patCtx.fillStyle = '#ffffff';
                patCtx.globalAlpha = 0.8;
                for(let i=0; i<50; i++){
                    patCtx.beginPath(); 
                    patCtx.arc(fw*randK(), fw*randK(), Math.abs(fw*(0.001 + randK()*0.002)), 0, Math.PI*2); 
                    patCtx.fill();
                }
                patCtx.globalAlpha = 1.0;
            }

            if (['cloud', 'neon', 'kirakira'].includes(fgPatternType)) {
                ctx.drawImage(patCanvas, 0, 0, CV_WIDTH, CV_HEIGHT);
            } else {
                const pattern = ctx.createPattern(patCanvas, 'repeat');
                if (pattern) {
                    ctx.save();
                    if (gen.effect_neon === true) { ctx.shadowColor = `hsla(${fgFillColorHue} ${fgFillColorSaturation}% ${fgFillColorLightness}% / ${fgFillColorAlpha}%)`; ctx.shadowBlur = 25; }
                    ctx.translate(CV_WIDTH/2, CV_HEIGHT/2); ctx.rotate(patternAngle); ctx.translate(-CV_WIDTH/2, -CV_HEIGHT/2);
                    ctx.fillStyle = pattern; ctx.fillRect(-CV_WIDTH, -CV_HEIGHT, CV_WIDTH*3, CV_HEIGHT*3);
                    ctx.restore();
                }
            }

        } else {
            for(let i=0;i<fgRepeatCountP;i++){
                for(let j=0;j<fgRepeatCountQ;j++){
                    let drawShapeCenterX=fgShapeOriginX+i*fgRepeatVectorP[0]+j*fgRepeatVectorQ[0];
                    let drawShapeCenterY=fgShapeOriginY+i*fgRepeatVectorP[1]+j*fgRepeatVectorQ[1];
                    let drawShapeRotate=fgRepeatRotateOrigin+i*fgRepeatRotate[0]+j*fgRepeatRotate[1];
                    let drawShapeSize=[fgShapeVertex[0][0]*(1+i*fgRepeatResize[0])*(1+j*fgRepeatResize[1]),fgShapeVertex[0][1]*(1+i*fgRepeatResize[0])*(1+j*fgRepeatResize[1])];
                    let tmpVertex=[[fgShapeVertex[0][0]*(1+i*fgRepeatResize[0])*(1+j*fgRepeatResize[1]),fgShapeVertex[0][1]*(1+i*fgRepeatResize[0])*(1+j*fgRepeatResize[1])],[fgShapeVertex[1][0]*(1+i*fgRepeatResize[0])*(1+j*fgRepeatResize[1]),fgShapeVertex[1][1]*(1+i*fgRepeatResize[0])*(1+j*fgRepeatResize[1])],[fgShapeVertex[2][0]*(1+i*fgRepeatResize[0])*(1+j*fgRepeatResize[1]),fgShapeVertex[2][1]*(1+i*fgRepeatResize[0])*(1+j*fgRepeatResize[1])]];
                    let drawShapeVertex=[[drawShapeCenterX+tmpVertex[0][0]*Math.cos(drawShapeRotate)-tmpVertex[0][1]*Math.sin(drawShapeRotate),drawShapeCenterY+tmpVertex[0][0]*Math.sin(drawShapeRotate)+tmpVertex[0][1]*Math.cos(drawShapeRotate)],[drawShapeCenterX+tmpVertex[1][0]*Math.cos(drawShapeRotate)-tmpVertex[1][1]*Math.sin(drawShapeRotate),drawShapeCenterY+tmpVertex[1][0]*Math.sin(drawShapeRotate)+tmpVertex[1][1]*Math.cos(drawShapeRotate)],[drawShapeCenterX+tmpVertex[2][0]*Math.cos(drawShapeRotate)-tmpVertex[2][1]*Math.sin(drawShapeRotate),drawShapeCenterY+tmpVertex[2][0]*Math.sin(drawShapeRotate)+tmpVertex[2][1]*Math.cos(drawShapeRotate)]];
                    let drawShapeFillHue=fgFillColorHue+i*fgRepeatChangeColorAHue+j*fgRepeatChangeColorBHue;
                    let drawShapeFillSaturation=fgFillColorSaturation+i*fgRepeatChangeColorASaturation+j*fgRepeatChangeColorBSaturation;
                    let drawShapeFillLightness=fgFillColorLightness+i*fgRepeatChangeColorALightness+j*fgRepeatChangeColorBLightness;
                    let drawShapeFill=`hsla(${drawShapeFillHue} ${drawShapeFillSaturation}% ${drawShapeFillLightness}% / ${fgFillColorAlpha}%)`;
                    
                    ctx.fillStyle=drawShapeFill;
                    ctx.lineWidth=fgStrokeWidth;
                    ctx.moveTo(drawShapeCenterX,drawShapeCenterY);
                    ctx.beginPath();
                    
                    let activeShapeType = fgShapeType;
                    if (fgShapeType2) {
                        activeShapeType = ((i + j) % 2 === 0) ? fgShapeType : fgShapeType2;
                    }

                    if(activeShapeType=='circle'){
                        ctx.arc(drawShapeCenterX,drawShapeCenterY,Math.abs(drawShapeSize[0]),0,2*Math.PI);
                    }
                    else if(activeShapeType=='ellipse'){
                        ctx.ellipse(drawShapeCenterX,drawShapeCenterY,Math.abs(drawShapeSize[0]),Math.abs(drawShapeSize[1]),drawShapeRotate,0,2*Math.PI);
                    }
                    else if(activeShapeType=='triangle'){
                        ctx.lineTo(drawShapeVertex[0][0],drawShapeVertex[0][1]);
                        ctx.lineTo(drawShapeVertex[1][0],drawShapeVertex[1][1]);
                        ctx.lineTo(drawShapeCenterX,drawShapeCenterY);
                        ctx.closePath();
                    }
                    else if(activeShapeType=='square'){
                        let sqW = Math.abs(drawShapeSize[0]) * 1.5; 
                        let sqH = Math.abs(drawShapeSize[1]) * 1.5; 
                        ctx.save();
                        ctx.translate(drawShapeCenterX, drawShapeCenterY); 
                        ctx.rotate(drawShapeRotate);                       
                        ctx.rect(-sqW, -sqH, sqW * 2, sqH * 2);            
                        ctx.restore();
                    }
                    else if(activeShapeType=='star'){
                        let points = 5;
                        let outerRadius = Math.max(Math.abs(drawShapeSize[0]), Math.abs(drawShapeSize[1])) * 1.5; 
                        let innerRadius = outerRadius * 0.4;
                        ctx.save();
                        ctx.translate(drawShapeCenterX, drawShapeCenterY); 
                        ctx.rotate(drawShapeRotate - Math.PI / 2);                   
                        ctx.moveTo(outerRadius, 0);            
                        for (let k = 1; k <= points * 2; k++) {
                            let radius = k % 2 === 0 ? outerRadius : innerRadius;
                            let angle = k * Math.PI / points;
                            ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                        }
                        ctx.closePath();
                        ctx.restore();
                    }
                    
                    if (gen.effect_neon === true) { ctx.shadowColor = drawShapeFill; ctx.shadowBlur = 25; } else { ctx.shadowBlur = 0; }
                    ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
                }
            }
        }

        ctx.restore();
        setupCanvasCamera(canvas, gen);
    }

    function torad(deg) { return deg / 180 * Math.PI; }
}

export function distance(p1, p2) {
    let size = Math.min(p1.length, p2.length);
    let sum = 0;
    for(let i=0;i<size;i++) sum += (p1[i]-p2[i])*(p1[i]-p2[i]);
    return Math.sqrt(sum);
}

export function setupCanvasCamera(canvas, gen) {
    if (canvas.dataset.cameraReady) return;
    canvas.dataset.cameraReady = "true";
    const genSnapshot = JSON.parse(JSON.stringify(gen));
    let camera = { x: 0, y: 0, zoom: 1.0, rotation: 0, isDragging: false, isRotating: false, startX: 0, startY: 0, rotateStartAngle: 0, rotateStartRotation: 0 };
    canvas.__cameraState = camera;

    const isPatternMode = (gen.fg_pattern && gen.fg_pattern !== 'none');
    const MIN_ZOOM = isPatternMode ? 1.0 : 0.2;
    const MAX_ZOOM = 5.0;

    function clampCameraPosition() {
        const cw = Number(canvas.width);
        const ch = Number(canvas.height);
        if (isPatternMode) {
            if (camera.zoom <= 1.0) {
                camera.x = 0; camera.y = 0; return;
            }
            const maxOffsetX = (cw * (camera.zoom - 1)) / 2;
            const maxOffsetY = (ch * (camera.zoom - 1)) / 2;
            camera.x = Math.max(-maxOffsetX, Math.min(maxOffsetX, camera.x));
            camera.y = Math.max(-maxOffsetY, Math.min(maxOffsetY, camera.y));
        }
    }

    function getAngleFromCenter(e) {
        const cw = Number(canvas.width); const ch = Number(canvas.height);
        const dx = e.offsetX - cw / 2; const dy = e.offsetY - ch / 2;
        return Math.atan2(dy, dx);
    }

    canvas.addEventListener('mousedown', (e) => {
        if (e.shiftKey) { camera.isRotating = true; camera.rotateStartAngle = getAngleFromCenter(e); camera.rotateStartRotation = camera.rotation; } 
        else { camera.isDragging = true; camera.startX = e.offsetX - camera.x; camera.startY = e.offsetY - camera.y; }
    });
    canvas.addEventListener('mousemove', (e) => {
        if (camera.isRotating) {
            const currentAngle = getAngleFromCenter(e); const rotation_sensitibity = 3;
            camera.rotation = camera.rotateStartRotation + (currentAngle - camera.rotateStartAngle)*rotation_sensitibity;
            drawCanvas(canvas, genSnapshot, camera); return;
        }
        if (!camera.isDragging) return;
        camera.x = e.offsetX - camera.startX; camera.y = e.offsetY - camera.startY;
        clampCameraPosition(); drawCanvas(canvas, genSnapshot, camera);
    });
    canvas.addEventListener('mouseup', () => { camera.isDragging = false; camera.isRotating = false; });
    canvas.addEventListener('mouseleave', () => { camera.isDragging = false; camera.isRotating = false; });
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomAmount = e.deltaY * -0.001;
        camera.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom + zoomAmount));
        clampCameraPosition(); drawCanvas(canvas, genSnapshot, camera);
    }, { passive: false });
}