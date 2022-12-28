/** Model file path for current plugin **/
const modelPath     	= 	__dirname+"/model/questions";
const modulePath		= 	"/"+ADMIN_NAME+"/questions/";
const adminQuestion     =   require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
    req.rendering.views	=	__dirname + "/views";
    next();
});

/** Routing is used to get questions list **/
app.all(modulePath,checkLoggedInAdmin,(req, res,next) => {
    adminQuestion.getQuestionList(req, res,next);
});

/** Routing is used to add question **/
app.all(modulePath+"add",checkLoggedInAdmin,(req,res,next) => {
    adminQuestion.addQuestion(req,res,next);
});

/** Routing is used to edit question **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,(req,res,next) => {
    adminQuestion.editQuestion(req,res,next);
});

/** Routing is used to delete question **/
app.all(modulePath+"delete/:id",checkLoggedInAdmin,(req,res,next) => {
    adminQuestion.deleteQuestion(req,res,next);
});


