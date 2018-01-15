var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var crypto = require('crypto');


var UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "can't be blank"],
    match: [/\S+@\S+\.\S+/, 'is invalid'], index: true,
    unique: true
  },
  username: {
    type: String,
    lowercase: true,
    required: [true, "can't be blank"],
    match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true,
    unique: true
  },
  hash: { type: String, required: true },
  salt: { type: String, required: true },
  admin: {
    type: Boolean,
    default: false
  },
  // activationEmailToken: String,
  // activationEmailExpires: Date,
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null }
}, {
  timestamps: true
});

UserSchema.plugin(uniqueValidator, {message: 'is already taken.'});

UserSchema.methods.toJSON = function () {
var obj = this.toObject();
delete obj.salt;
delete obj.hash;
return obj;
};

UserSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UserSchema.methods.validatePassword = function (password) {
  var hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
  return this.hash === hash;
};

UserSchema.pre('save', function (next) {
  next();
});

var User = mongoose.model('User', UserSchema);
