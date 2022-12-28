
var modulePath = __dirname + "/model/testimonial";
var modelPath = "/admin/testimonial";

app.use(modelPath, (req, res, next) => {
  req.rendering.views = __dirname + "/views";
  next();
});

/** Routing is used to get listing **/

app.all(modelPath, checkLoggedInAdmin, function (req, res) {
  var testimonial = require(modulePath);
  testimonial.list(req, res);
});

/** Routing is used to add  **/

app.all(modelPath + "/add", checkLoggedInAdmin, async function (req, res) {
    var testimonial = require(modulePath);
    testimonial.add(req, res);
});

/** Routing is used to view detail**/

app.get(modelPath + "/view/:id", checkLoggedInAdmin, function (req, res) {
  var testimonial = require(modulePath);
  testimonial.view(req, res);
});

/** Routing is used to edit detail**/

app.all(modelPath + "/edit/:id", checkLoggedInAdmin,async function (req, res) {
  var testimonial = require(modulePath);
  testimonial.edit(req, res);
});

/** Routing is used to delete  **/

app.all(modelPath + "/delete/:id", checkLoggedInAdmin, function (req, res) {
  var testimonial = require(modulePath);
  testimonial.deleteDetail(req, res);
});

/** Routing is used to update status**/

app.all(modelPath + "/update_status/:id/:status",checkLoggedInAdmin, function (req,res) {
  var testimonial = require(modulePath);
  testimonial.updateStatus(req, res);
});
