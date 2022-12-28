



/*on scroll add class on body*/
window.onscroll = function() {
    myFunction()
};
// var header = document.getElementById("fixed-header");
// var sticky = header.offsetTop;
function myFunction() {
    if (window.pageYOffset > sticky) {
        header.classList.add("sticky");
    } else {
        header.classList.remove("sticky");
    }
}


$(window).scroll(function() {    
    var scroll = $(window).scrollTop();

    if (scroll >= 100) {
        $("body").addClass("fixed");
    } else {
        $("body").removeClass("fixed");
    }
});


/*owl carousel slider*/
$(".testimonials-slider").owlCarousel({
    loop: true,
    autoplay:true,
    nav: true,
    //dots: true,
    items: 1,
});


// Example starter JavaScript for disabling form submissions if there are invalid fields
(function () {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  var forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.prototype.slice.call(forms)
    .forEach(function (form) {
      form.addEventListener('submit', function (event) {
        if (!form.checkValidity()) {
          event.preventDefault()
          event.stopPropagation()
        }

        form.classList.add('was-validated')
      }, false)
    })
})()



$(document).ready(function(){
  $('.subjects-list .subjects-box').click(function(){
    $('.subjects-list .subjects-box').removeClass("active");
    $(this).addClass("active");
});

$('.board-university-list ul li').click(function(){
    $('.board-university-list ul li').removeClass("active");
    $(this).addClass("active");
});

$('.board-university-box').click(function(){
    $('.board-university-box').removeClass("active");
    $(this).addClass("active");
});

$('.sub-sub-content-bg').click(function(){
    $('.sub-sub-content-bg').removeClass("active");
    $(this).addClass("active");
});

$('.subscription-plan-list li').click(function(){
    $('.subscription-plan-list li').removeClass("active");
    $(this).addClass("active");
});
});











