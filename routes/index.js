var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'WebXR Samples' });
});

router.get('/three', function (req, res, next) {
  res.render('three', {});
});

router.get('/three-webxr', function (req, res, next) {
  res.render('three-webxr', {});
});

router.get('/ar-hittest', function (req, res, next) {
  res.render('ar-hittest', {});
});

router.get('/ratk-hittest', function (req, res, next) {
  res.render('ratk-hittest', {});
});


module.exports = router;
