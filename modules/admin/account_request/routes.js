/** Model file path for current plugin **/
const modelPath     =	__dirname+"/model/account_request";
const modulePath	= 	"/"+ADMIN_NAME+"/account_request/";
const expertUser	=   require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req,res,next)=>{
   req.rendering.views	=	__dirname + "/views";
   next();
});

/** Routing is used to get user list **/
app.all(modulePath,checkLoggedInAdmin,(req, res)=>{
    expertUser.getUserList(req, res);
});

/** Routing is used to view user details **/
app.get(modulePath+"view/:id",checkLoggedInAdmin,(req, res,next)=>{
    expertUser.viewUserDetails(req, res,next);
});

/** Routing is used to update user aprroval status **/
app.all(modulePath+"approval_status/:status/:id",checkLoggedInAdmin,(req,res,next)=>{
    expertUser.updateUserAprrovalStatus(req,res,next);
});






