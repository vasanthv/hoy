<style scoped>
#notificationRequest {
	background: rgb(var(--text));
	color: rgb(var(--white));
	padding: 1rem;
}
#notificationRequest button {
	background: rgb(var(--white));
	color: rgb(var(--text));
	margin-top: 1rem;
}
</style>

<template>
	<section id="notificationRequest">
		You haven't enabled notification for this browser, please enable notifications to receive your Hoys on this browser.

		<button v-on:click="allowNotifications">Allow notifications</button>
	</section>
</template>
<script>
export default {
	props: ["notificationrequestclickhandler"],
	data() {
		return {};
	},
	computed: {},
	methods: {
		allowNotifications() {
			this.notificationrequestclickhandler();
		},
	},
};
</script>
