var express = require('express');
var router = express.Router();
var passport = require('passport');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');


router.get('/users', function(req, res, next) {
  User.find(function (err, users) {
    if (err) {
      res.status(400).send(err);
    }
    res.json(users);
  });
});

router.get('/login', function(req, res, next) {
  res.render('login', {
    user: req.user
  });
});

router.post('/login', function(req, res, next) {
  req.checkBody('username', 'Username is required').notEmpty();
  req.checkBody('password', 'Password is required').notEmpty();

  var errors = req.validationErrors();
  // console.log(errors);
  if (errors) {
    res.render('login', {
      flash: {
        type: 'alert-danger',
        messages: errors
      }
    });
  }

  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err); }

    if (!user) {
      res.redirect('/login');
    } else {
      req.logIn(user, function (err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
    }
  })(req, res, next);
});

router.get('/register', function(req, res) {
  res.render('register');
});

router.post('/register', function(req, res, next) {
  // validate the inputs
  req.checkBody('username', 'Username is required').notEmpty();
  req.checkBody('password', 'Password is required').notEmpty();
  req.checkBody('display', 'DisplayName is required').notEmpty();
  req.checkBody('email', 'Email is required').notEmpty();
  req.checkBody('email', 'Email does not appear to be valid').isEmail();

  // check the validation object for errors
  var errors = req.validationErrors();
  // console.log(errors);
  if (errors) {
    res.render('register', {
      flash: {
        type: 'alert-danger',
        messages: errors
      }
    });
  } else {
    var user = new User();
    user.username = req.body.username;
    user.email = req.body.email;
    user.setPassword(req.body.password);

    user.save()
      .then(function(user) {
        passport.authenticate('local', function(err, user, info) {
          if (err) { return next(err); }

          if (!user) {
            res.redirect('/login');
          } else {
            req.logIn(user, function (err) {
              if (err) { return next(err); }
              res.redirect('/');
            });
          }
        })(req, res, next);
      })
      .catch(function (err) {
        if (err) {
          res.send(err);
        }
      });
  }
});

router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

router.get('/profile', isLoggedIn, function(req, res) {
  res.render('profile', {
    user : req.user // get the user out of session and pass to template
  });
});

router.get('/forgot-password', function(req, res) {
  res.render('forgot-password', {
    user: req.user
  });
});

router.post('/forgot-password', function(req, res, next) {
  async.waterfall([
    function(done) {
      var token = crypto.randomBytes(20).toString('hex');
      done(null, token);
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot-password');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save()
          .then(function(user) {
            // console.log(user);
            // console.log('\n');
            done(null, token, user);
          })
          .catch(function(err) {
            // console.log(err);
            // console.log('\n');
            done(err, token, null);
          });
      });
    },
    function(token, user, done) {
      if (!user) {
        req.flash('error', 'No account with that email address exists.');
        return res.redirect('/forgot-password');
      }

      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: 'your-email-address',
          pass: 'your-password'
        }
      });

      var mailOptions = {
        from: 'passwordreset@demo.com',
        to: user.email,
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
        'http://' + req.headers.host + '/reset/' + token + '\n\n' +
        'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };

      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot-password');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
    }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset-password', {
      user: req.user
    });
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
        }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save().then(function(err) {
          req.logIn(user, function(err) {
            done(err, user);
          });
        });
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: 'your-email-address',
          pass: 'your-password'
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'passwordreset@demo.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
        'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/');
  });
});

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
  // if user is authenticated in the session, carry on
  if (req.isAuthenticated())
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/');
}


module.exports = router;
