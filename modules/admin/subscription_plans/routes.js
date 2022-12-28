/** Model file path for current plugin **/
const modelPath     = 	__dirname+"/model/subscription_plans";
const modulePath	= 	"/"+ADMIN_NAME+"/subscription_plans/";
const adminSubscriptions      =   require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
    req.rendering.views	=	__dirname + "/views";
    next();
});

/** Routing is used to get plan list **/
app.all(modulePath,checkLoggedInAdmin,(req, res, next) => {
    adminSubscriptions.getPlanList(req, res,next);
});

/** Routing is used to add plan **/
app.all(modulePath+"add",checkLoggedInAdmin,(req, res, next) => {
    adminSubscriptions.addPlan(req,res,next);
});

/** Routing is used to edit paln **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,(req, res, next) => {
    adminSubscriptions.editPlan(req,res,next);
});

/** Routing is used to view plan details **/
app.get(modulePath+"view/:id",checkLoggedInAdmin,(req, res,next)=>{
    adminSubscriptions.viewPlan(req, res,next);
});

/** Routing is used to update recommend plan status **/
app.get(modulePath+"update_plan_status/:id",checkLoggedInAdmin,(req, res,next)=>{
    adminSubscriptions.updatePlanStatus(req, res,next);
});