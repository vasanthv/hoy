<template>
	<div class="row">
		<details open>
			<summary class="bold">&nbsp;&nbsp;&nbsp;Profile</summary>
			<section>
				<div class="field">
					<label class="bold">Handle</label>
					<input type="text" placeholder="Your Handle" v-model="updatedAccount.handle" />
				</div>
				<div class="field">
					<label class="bold">Email</label>
					<input type="text" placeholder="Your Email" v-model="updatedAccount.email" />
				</div>
				<div class="field">
					<label class="bold">Color</label>
					<input type="color" placeholder="Color" v-model="updatedAccount.color" />
				</div>
				<div class="field">
					<label class="bold">Password</label>
					<input type="password" placeholder="Password" v-model="updatedAccount.password" />
				</div>
				<div class="field">
					<button v-on:click="updateAccount">Update Profile</button>
				</div>
				<div class="field"><hr /></div>
			</section>
		</details>
	</div>

	<div class="row" v-if="account.blocked && account.blocked.length > 0">
		<details>
			<summary class="bold">&nbsp;&nbsp;&nbsp;Blocked users</summary>
			<section id="blocked">
				<div class="field flex vmiddle" v-for="(contact, i) in account.blocked">
					<label class="bold flex-1">{{ contact.handle }}</label>
					<button
						class="icon-remove"
						v-bind:style="'color: ' + contact.color"
						v-on:click="unblockUser(contact.handle)"
					></button>
				</div>
				<br /><br />
				<div class="field"><hr /></div>
			</section>
		</details>
	</div>

	<div class="row">
		<details>
			<summary class="bold">&nbsp;&nbsp;&nbsp;Connected browsers</summary>
			<section id="blocked">
				<div class="field flex vmiddle" v-for="(browser, i) in account.devices">
					<label class="bold flex-1">{{
						browser.meta.browser.name ? `${browser.meta.browser.name} (${browser.meta.os.name})` : browser.userAgent
					}}</label>
					<button v-if="!browser.isCurrent" class="icon-remove" v-on:click="removeBrowser(browser.id)"></button>
					<span class="small light" v-if="browser.isCurrent">Current</span>
				</div>
				<br /><br />
				<div class="field"><hr /></div>
			</section>
		</details>
	</div>

	<div class="row">
		<details>
			<summary class="bold">&nbsp;&nbsp;&nbsp;Logout</summary>
			<div class="field">Logged in as {{ handle }}</div>
			<div class="field">
				<button class="red" v-on:click="logout()">Logout</button>
			</div>
		</details>
	</div>

	<div class="row small light">
		<div class="field">
			&copy; hoy.im &middot; <a href="/terms">Terms</a> &middot;
			<a href="mailto:vasanth@hoy.im" target="_blank">Contact</a>
		</div>
	</div>
	<br />
</template>

<style scoped>
details {
	margin: 0px 0.5rem 2rem;
}
summary {
	cursor: pointer;
}
.field {
	padding: 0px 1.75rem;
	margin: 1rem auto;
}
.field label {
	display: block;
}
.icon-remove {
	background: var(--white);
	color: rgb(var(--text));
}
</style>

<script>
export default {
	props: ["account", "handle", "updateaccount", "unblockcontact", "blockedcontacts", "deletebrowser", "logout"],
	data() {
		return {
			updatedAccount: this.account,
		};
	},
	methods: {
		updateAccount() {
			this.updateaccount(this.updatedAccount);
		},
		unblockUser(handle) {
			this.unblockcontact(handle);
		},
		removeBrowser(id) {
			this.deletebrowser(id);
		},
	},
	watch: {
		account(newVal, oldVal) {
			this.updatedAccount = newVal;
		},
	},
};
</script>
