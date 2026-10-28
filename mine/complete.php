<?php 

$errorFlag = false;

// 値の検証
if(isset($_POST["student_num"])) {
	validateString($_POST["student_name"], 3000, false);
	validateInt($_POST["student_num"], 1000000, 2399999);
	validateInt($_POST["q01"], 1, 5);
	validateString($_POST["q01A"], 3000, false);
	validateString($_POST["q02"], 3000, true);
	validateString($_POST["q03"], 3000, true);
	validateInt($_POST["q04"], 1, 5);
	validateInt($_POST["q05"], 1, 5);
	validateString($_POST["q05A"], 3000, true);
	validateString($_POST["q05B"], 3000, true);
	validateInt($_POST["q06"], 1, 5);
	validateInt($_POST["q07"], 1, 5);
	validateString($_POST["q07A"], 3000, true);
	validateString($_POST["q07B"], 3000, false);
	validateString($_POST["q08"], 3000, false);
} else {
	$errorFlag = true;
}

function validateString($checkStr, $maxLength, $required) {
	$strNoSpace = preg_replace("/\s/i", "", $checkStr);
	if (
		($required && (strlen($strNoSpace) == 0)) ||
		(strlen($checkStr) > $maxLength)
	) {
		$errorFlag = true;
	}
}

function validateInt($checkNum, $min, $max) {
	if((int)$checkNum == $checkNum) {
		if (((int)$checkNum < $min) || ((int)$checkNum > $max)) {
			$errorFlag = true;
		}
	} else {
		$errorFlag = true;
	}
}

// データ保存
if (!$errorFlag) {
	// 識別子を日付から決定
	date_default_timezone_set('Asia/Tokyo');
	$date = date("ymd-His");

	if (file_exists("collected/$date-eval.txt")) {
		// 同時間の上書きを回避
		$errorFlag = true;
	} else {
		// アンケート回答をCSVに追記
		$csvWriteArray = array(
			$date,
			$_POST["student_name"],
			$_POST["student_num"],
			$_POST["q01"],
			$_POST["q01A"],
			$_POST["q02"],
			$_POST["q03"],
			$_POST["q04"],
			$_POST["q05"],
			$_POST["q05A"],
			$_POST["q05B"],
			$_POST["q06"],
			$_POST["q07"],
			$_POST["q07A"],
			$_POST["q07B"],
			$_POST["q08"]
		);
		$fp_form = fopen("collected/form.csv", "a");
		fputcsv($fp_form, $csvWriteArray);
		fclose($fp_form);
	
		// 評価文は別ファイルに保存
		$fp_eval = fopen("collected/$date-eval.txt", "a");
		$evalArray = json_decode($_POST["evaluationText"]);
		foreach ($evalArray as $i => $text) {
			fputs($fp_eval, "◆".($i + 1)."回目=======================\n");
			fputs($fp_eval, $text);
		}
		fclose($fp_eval);
	
		// 画像は1枚ずつ保存
		$imageArray = json_decode($_POST["canvasData"]);
		foreach ($imageArray as $i => $base64Text) {
			$noHeader = preg_replace("/data:[^,]+,/i", "", $base64Text);
			$decodedImage = base64_decode($noHeader);
			$imgName = "collected/images/".$date."-".($i + 1).".png";
			file_put_contents($imgName, $decodedImage, LOCK_EX);
		}
	}
}
?>

<!DOCTYPE html>
<html lang="ja">
<head>
	<title>送信完了 | 話してつくる、まだ見ぬ模様 BIGAN</title>
	<meta name="author" content="rksgm">
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="description" content="2024年度卒業研究「二個体比較と自然言語での評価を用いたIGAによる背景画像生成システム」にて作成したシステムです。">
	<link rel="shortcut icon" href="./assets/images/favicon.png" type="image/x-icon">
	<meta name="robots" content="noindex,nofollow">
	<meta name="format-detection" content="email=no,telephone=no,address=no">

	<meta prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# website: http://ogp.me/ns/website#">
	<meta property="og:type" content="website">
	<meta property="og:url" content="https://ogumay.hiyoko.biz/bigan/">
	<meta property="og:title" content="BIGAN | 話してつくる、まだ見ぬ模様">
	<meta property="og:description" content="2024年度卒業研究「二個体比較と自然言語での評価を用いたIGAによる背景画像生成システム」にて作成したシステムです。">
	<meta property="og:site_name" content="BIGAN">
	<meta property="og:image" content="https://ogumay.hiyoko.biz/bigan/assets/images/bigan_large.png">

	<link rel="stylesheet" href="./style/ress_min.css">
	<link rel="stylesheet" href="./style/style.css">

	<?php 
		if ($errorFlag) { ?>
			<script>
				alert("申し訳ございません。処理が混み合っている可能性があります。お手数ですが、もう一度お試しください。");
				history.back();
			</script>
	<?php
		}
	?>
</head>
<body>
	<header>
		<div class="header-icon"><img src="assets/images/bigan.png" alt="ロゴ"></div>
		<div class="header-logotype"><img src="assets/images/bigan_logotype.svg" alt="ロゴタイプ"></div>
		<div class="header-control">
			<!-- <button onclick="location.href = './'">最初から</button> -->
			<button id="toggleTheme">テーマ</button>
		</div>
	</header>
	<main>
		<h1>ご協力ありがとうございました m(__)m</h1>
		<h2>回答が保存されました。</h2>
	</main>
</body>
<script type="module" src="./script/themes.js"></script>
</html>