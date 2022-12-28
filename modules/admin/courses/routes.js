/** Model file path for current plugin **/
const modelPath     = 	__dirname+"/model/courses";
const modulePathCourse	= 	"/"+ADMIN_NAME+"/courses/";
const modulePathSubject	= 	"/"+ADMIN_NAME+"/subjects/";
const adminCourses  =   require(modelPath);

/** Set current view folder **/
app.use(modulePathCourse,(req, res, next) => {
    req.rendering.views	=	__dirname + "/views";
    next();
});

/** Set current view folder **/
app.use(modulePathSubject,(req, res, next) => {
    req.rendering.views	=	__dirname + "/views";
    next();
});

/** Routing is used to get courses list **/
app.all(modulePathCourse, checkLoggedInAdmin,(req, res,next) => {
    adminCourses.getCourseList(req, res,next);
});

/** Routing is used to add course **/
app.all(modulePathCourse+"add",checkLoggedInAdmin,(req,res,next) => {
    adminCourses.addCourse(req,res,next);
});

/** Routing is used to edit course **/
app.all(modulePathCourse+"edit/:id",checkLoggedInAdmin,(req,res,next) => {
    adminCourses.editCourse(req,res,next);
});

/** Routing is used to delete course **/
app.all(modulePathCourse+"delete/:id",checkLoggedInAdmin,(req,res,next) => {
    adminCourses.deleteCourse(req,res,next);
});


/** Routing is used to get syllabus html**/
app.all(modulePathCourse+"courseHtml/:id",checkLoggedInAdmin,(req,res,next) => {
    adminCourses.getCourseListHtml(req,res,next);
});

/** Routing is used to get syllabus html**/
app.all(modulePathCourse+"syllabusHtml/:id",checkLoggedInAdmin,(req,res,next) => {
    adminCourses.getSyllabusListHtml(req,res,next);
});


/** Routing is used to get syllabus **/
app.all(modulePathSubject,checkLoggedInAdmin,(req,res,next) => {
    adminCourses.getSyllabusList(req,res,next);
});

/** Routing is used to add syllabus within course **/
app.all(modulePathSubject+"add",checkLoggedInAdmin,(req,res,next) => {
    adminCourses.addSyllabus(req,res,next);
});

/** Routing is used to edit syllabus within course **/
app.all(modulePathSubject+"edit/:id",checkLoggedInAdmin,(req,res,next) => {
    adminCourses.editSyllabus(req,res,next);
});

/** Routing is used to delete sub-category within category **/
app.all(modulePathSubject+"delete/:id",checkLoggedInAdmin,(req,res,next) => {
    adminCourses.deleteSyllabus(req,res,next);
});

