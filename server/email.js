const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");
const { htmlToText } = require("html-to-text");
const Mustache = require("mustache");

const config = require("./config");

const verificationEmail = (handle, email, code) => {
	const verificartionEmailLink = `${config.URL}api/verify/${code}`;

	const params = {
		Source: "Hoy.im <login@donotreply.hoy.im>",
		Destination: { ToAddresses: [email] },
		Message: {
			Subject: { Charset: "UTF-8", Data: `Please verify your email` },
			Body: {
				Html: {
					Charset: "UTF-8",
					Data: `Hello @${handle}<br/><br/>Please click on the link below to verify your email.<br/><a href="${verificartionEmailLink}" target='_blank'>${verificartionEmailLink}</a><br/><br/>Thanks<br/><b>Team Hoy</b>`,
				},
				Text: {
					Charset: "UTF-8",
					Data: `Hello @${handle}\n\nPlease click on the link below to verify your email.\n${verificartionEmailLink}\n\nThanks\nTeam Hoy`,
				},
			},
		},
	};
	sendEmail(params);
};

const resetPasswordEmail = (handle, email, password) => {
	var params = {
		Source: "Hoy.im <login@donotreply.hoy.im>",
		Destination: { ToAddresses: [email] },
		Message: {
			Subject: { Charset: "UTF-8", Data: `Your password has been resetted.` },
			Body: {
				Html: {
					Charset: "UTF-8",
					Data: `Hello @${handle}<br/><br/>Your password to log in to your Hoy account is: <b>${password}</b><br/><br/>Note: Please change your password immediately after logging in.<br/><br/>Thanks<br/><b>Team Hoy</b>`,
				},
				Text: {
					Charset: "UTF-8",
					Data: `Hello @${handle}\n\nYour password to log in to Hoy account is: ${password}\n\nNote: Please change your password immediately after logging in.\n\nThanks\nTeam Hoy`,
				},
			},
		},
	};
	sendEmail(params);
};

const sendInviteEmail = (user, email) => {
	const emailBody = fs.readFileSync(path.join(__dirname, "../emails/invite-email.html")).toString();
	const emailHTML = Mustache.render(emailBody, { handle: user.handle });

	sendEmailFromHTMLBody(`Hoy! ${user.handle} has invited you to join Hoy.`, emailHTML, [email]);
};

const sendEmailToUsers = (emailName, users) => {
	const emailBody = fs.readFileSync(fs.readFileSync(path.join(__dirname, "../emails/" + emailName + ".html")));

	const subject = emailBody.match(/<title>(.*?)<\/title>/g).map(function (val) {
		return val.replace(/<\/?title>/g, "");
	})[0];

	users.forEach((user) => {
		const emailHTML = Mustache.render(emailBody, user);
		sendEmailFromHTMLBody(subject, emailHTML, [user.email]);
	});
};

const sendEmailFromHTMLBody = (subject, emailHTML, recipients = []) => {
	recipients.forEach((email) => {
		const params = {
			Source: "Hoy.im <noreply@donotreply.hoy.im>",
			Destination: { ToAddresses: [email] },
			Message: {
				Subject: { Charset: "UTF-8", Data: subject },
				Body: {
					Html: {
						Charset: "UTF-8",
						Data: emailHTML,
					},
					Text: {
						Charset: "UTF-8",
						Data: htmlToText(emailHTML),
					},
				},
			},
		};

		sendEmail(params);
	});
};

const sendEmail = (params) => {
	return new Promise((resolve, reject) => {
		new AWS.SES({
			accessKeyId: config.AWS_ACCESS_KEY,
			secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
			region: "us-west-2",
		}).sendEmail(params, function (err, data) {
			if (err) reject(err);
			// an error occurred
			else resolve(data); // successful response
		});
	});
};

module.exports = { verificationEmail, resetPasswordEmail, sendInviteEmail, sendEmailToUsers, sendEmailFromHTMLBody };
