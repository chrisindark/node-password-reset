var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var User = mongoose.model('User');


passport.use('local', new LocalStrategy(function(username, password, done) {
  User.findOne({ username: username }, function(err, user) {
    // console.log(err);
    if (err) return done(err);
    if (!user || !user.validatePassword(password)) {
      return done(null, false, { msg: 'Unable to log in with provided credentials.' });
    }

    return done(null, user);
  });
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
