$(document).ready(function () {
  // CUSTOM FILE NAME FOR ADD PRODUCT PAGE
  $('.custom-file-input').on('change', function () {
    var fileName = $(this).val().split('\\').pop();
    $(this).siblings('.custom-file-label').addClass('selected').html(fileName);
  });
});
