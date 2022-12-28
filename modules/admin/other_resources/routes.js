/** Model file path for current plugin **/
const modelPath     = 	__dirname+"/model/other_resources";
const modulePath	= 	"/"+ADMIN_NAME+"/other_resources/";
const adminOtherResources      =   require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
    req.rendering.views	=	__dirname + "/views";
    next();
});

/** Routing is used to get other resource list **/
app.all(modulePath,checkLoggedInAdmin,(req, res,next) => {
    adminOtherResources.getOtherResourceList(req, res,next);
});

/** Routing is used to add other resource **/
app.all(modulePath+"add",checkLoggedInAdmin,(req,res,next) => {
    adminOtherResources.addOtherResource(req,res,next);
});

/** Routing is used to edit other resource **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,(req,res,next) => {
    adminOtherResources.editOtherResource(req,res,next);
});