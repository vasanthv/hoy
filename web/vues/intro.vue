<style scoped>
#loginBtn {
	background: rgb(2, 0, 36);
	background: linear-gradient(135deg, #6549d5 0%, #db3c9c 40%, #f65056 60%, #fb5343 80%, #fd7b42 100%);
}
.spacer {
	height: 5rem;
}
</style>

<template>
	<main class="wrap">
		<div class="row">
			<h1>Hoy</h1>
			<h2>Send push notifications to your friends.</h2>
			<div>
				<a href="/register" class="button">Register</a> <a href="/login" id="loginBtn" class="button blue">Login</a>
			</div>
		</div>
		<div class="spacer"></div>
		<div class="row">
			<label>What is Hoy?</label>
			<p>Hoy is a web app that lets you send push notifications to your friends with just a push of a button.</p>
		</div>

		<div class="row">
			<label>What can I share using Hoy?</label>
			<p>You can send short text messages (&lt; 65 characters), emojis or web links using Hoy.</p>
		</div>

		<div class="row">
			<label>How does it work?</label>
			<p>
				Hoy uses web push to send push notifications to other users. We do not store your messages on our server. Add or
				invite your friends to Hoy and start sending Hoys.
			</p>
		</div>

		<div class="row">
			<label>Can I use this on my mobile?</label>
			<p>
				Yes, you can. Use it like any other web app. If you are using iOS, it works only from version 16.4, and you need
				to
				<a href="https://www.cdc.gov/niosh/mining/content/hearingloss/installPWA.html" target="_blank"
					>add the web app to your home screen</a
				>
				to use the push notifications.
			</p>
		</div>

		<div class="row">
			<label>Who made Hoy?</label>
			<p>Hoy is a side project of Vasanth (<a href="https://twitter.com/vsnthv" target="_blank">@vsnthv</a>).</p>
		</div>

		<div class="row small light">
			&copy; hoy.im &middot; <a href="/terms">Terms</a> &middot;
			<a href="mailto:vasanth@hoy.im" target="_blank">Contact</a>
		</div>

		<br /><br />
	</main>
</template>
