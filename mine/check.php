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
?>

<!DOCTYPE html>
<html lang="ja">
<head>
	<title>評価実験アンケートの確認 | 話してつくる、まだ見ぬ模様 BIGAN</title>
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

	<script type="text/javascript">
		<?php if($errorFlag) echo 'alert("申し訳ございません。アンケートの回答内容をもう一度ご確認ください。\n\n考えられる原因：\n- 文字数が多すぎる回答がある")' ?>
		<?php if($errorFlag) echo 'history.back()' ?>
		const postData = <?php echo json_encode($_POST) ?>;
	</script>
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
		<section class="formCheck">
			<h1>評価実験アンケートの確認</h1>
			<h2>以下の内容で送信します。よろしいですか？</h2>

			<dl>
				<?php 
					$choice01 = array(
						'5' => 'なんでも自作したい',
						'4' => '既存のものを活用しつつ、自作を入れてオリジナリティも出したい',
						'3' => '既存のものをそのまま、または組み合わせてなんとかしたい',
						'2' => '誰か（機械含む）に任せたい',
						'1' => 'その他'
					);
					$choice04 = array(
						'5' => 'イメージそのものだった',
						'4' => 'かなり近かった',
						'3' => '少し近かった',
						'2' => 'どちらともいえない',
						'1' => '全く異なっていた'
					);
					$choice05 = array(
						'5' => '5: 完璧に反映された',
						'4' => '4: ある程度反映された',
						'3' => '3: どちらともいえない',
						'2' => '2: 少ししか反映されず',
						'1' => '1: まったく反映されず'
					);
					$choice06 = array(
						'5' => '5: 快適！',
						'4' => '4: OK',
						'3' => '3: どちらともいえない',
						'2' => '2: ちょっと遅いかも',
						'1' => '1: もっさり...'
					);
					$choice07 = array(
						'5' => '5: 最高！',
						'4' => '4: 及第点',
						'3' => '3: どちらともいえない',
						'2' => '2: 微妙',
						'1' => '1: イマイチ...'
					);
				?>
				<dt>名前</dt>
				<dd><? echo htmlspecialchars($_POST["student_name"]) ?></dd>
				<dt>学籍番号</dt>
				<dd><? echo $_POST["student_num"] ?></dd>
				<dt>質問 1：なにかにデザインを使うとき、そのデザインを作ることについて、どう考えていますか？</dt>
				<dd><? echo $choice01[$_POST["q01"]] ?></dd>
				<dt>質問 1-1：上記の質問における回答について、理由がありましたら教えてください。</dt>
				<dd><? echo htmlspecialchars($_POST["q01A"]) ?></dd>
				<dt>質問 2：このシステムで作成した画像を、なにに使おうと考えますか？</dt>
				<dd><? echo htmlspecialchars($_POST["q02"]) ?></dd>
				<dt>質問 3：どのようなイメージの画像を生成しようと思いましたか？</dt>
				<dd><? echo htmlspecialchars($_POST["q03"]) ?></dd>
				<dt>質問 4：初期候補の画像は、上記の質問で回答した内容にどれだけ近かったですか？</dt>
				<dd><? echo $choice04[$_POST["q04"]] ?></dd>
				<dt>質問 5：あなたが入力した評価は、最終的にどれくらい反映されましたか？</dt>
				<dd><? echo $choice05[$_POST["q05"]] ?></dd>
				<dt>質問 5-1：特に反映されたと思う評価文がありましたら教えてください。</dt>
				<dd><? echo htmlspecialchars($_POST["q05A"]) ?></dd>
				<dt>質問 5-2：逆に、まったく反映されなかったと思う評価文がありましたら教えてください。</dt>
				<dd><? echo htmlspecialchars($_POST["q05B"]) ?></dd>
				<dt>質問 6：このシステムの動作は快適でしたか？</dt>
				<dd><? echo $choice06[$_POST["q06"]] ?></dd>
				<dt>質問 7：このシステムは使いやすかったですか？</dt>
				<dd><? echo $choice07[$_POST["q07"]] ?></dd>
				<dt>質問 7-1：使いやすかったところ、使いにくかったところを教えてください。</dt>
				<dd><? echo htmlspecialchars($_POST["q07A"]) ?></dd>
				<dt>質問 7-2：このシステムに追加してほしい機能がありましたら教えてください。</dt>
				<dd><? echo htmlspecialchars($_POST["q07B"]) ?></dd>
				<dt>質問 8：システムおよび当アンケートでの、ご意見やご感想などありましたら教えてください。</dt>
				<dd><? echo htmlspecialchars($_POST["q08"]) ?></dd>
			</dl>
			<div class="buttons">
				<button class="submit" id="submitBtn">送信する！</button>
				<button class="back" onclick="history.back()">いったん戻る</button>
			</div>
		</section>
	</main>
</body>
<script type="module" src="./script/themes.js"></script>
<script type="module" src="./script/estimationCheck.js"></script>