<template>
	<div v-bind:class="'item ' + (ischecked ? 'checked' : '')">
		<div class="flex vmiddle">
			<div class="icon-circle" v-bind:style="'color: ' + color" v-on:click="sendhoy(hoyhandle)"></div>
			<div class="flex-1"><span class="handle" v-html="label" v-on:click="activeContact = !activeContact"></span></div>
			<span
				v-bind:class="'small chars ' + (typedText.length > 65 ? 'red' : '')"
				v-if="showtextbox && typedText.length > 0 && !isURL"
			>
				{{ typedText.length }}
			</span>
			<div
				v-if="!showRemoveButton"
				v-bind:class="'checkbox icon' + (ischecked ? '-check' : '') + '-circle-o'"
				v-on:click="oncheck(handle)"
			></div>
			<div class="icon-remove" v-if="showRemoveButton" v-on:click="removeContact"></div>
			<div class="icon-ban" v-if="showRemoveButton" v-on:click="blockContact"></div>
		</div>
		<div class="textHoy" v-if="showtextbox">
			<input
				type="text"
				class="flex-1"
				placeholder="Type something..."
				v-model="typedText"
				@input="onTextChange"
				@keydown.enter="sendhoy(hoyhandle)"
			/>
			<button @click="sendhoy(hoyhandle)">Send</button>
		</div>
	</div>
</template>

<script>
export default {
	props: [
		"handle", // handle to be used for toggling select
		"hoyhandle", // handle(s) to send hoy to
		"color", // color of the dot
		"label", // label to be displayed on the list item
		"text",
		"ischecked",
		"showtextbox",
		"sendhoy",
		"oncheck",
		"ontextchange",
		"enableremovecontact",
		"removecontact",
		"blockcontact",
	],
	data() {
		return {
			typedText: this.text,
			activeContact: false,
		};
	},
	computed: {
		showRemoveButton() {
			return this.enableremovecontact && this.activeContact && !this.ischecked;
		},
		isURL() {
			try {
				const url = new URL(this.typedText);
				return true;
			} catch (err) {
				return false;
			}
		},
	},
	methods: {
		onTextChange() {
			this.ontextchange(this.typedText);
		},
		removeContact() {
			if (this.enableremovecontact && confirm(`Are you sure, you want to remove ${this.handle}?`)) {
				this.removecontact(this.handle);
			}
		},
		blockContact() {
			this.blockcontact(this.handle);
		},
	},
	watch: {
		text: function (newVal, oldVal) {
			if (newVal !== this.typedText) {
				this.typedText = newVal;
			}
		},
	},
};
</script>
