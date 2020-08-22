$(document).ready(function () {
  $('.admin-delete').click(function () {
    const prodId = $(this).siblings('[name=productId]')[0].value;
    const csrf = $(this).siblings('[name=_csrf]')[0].value;

    const productElement = $(this).closest('article');

    fetch('/admin/product/' + prodId, {
      method: 'DELETE',
      headers: {
        'csrf-token': csrf,
      },
    })
      .then((result) => {
        return result.json();
      })
      .then((data) => {
        productElement.remove();
      })
      .catch((err) => {
        console.log(err);
      });
  });

  // CUSTOM FILE NAME FOR ADD PRODUCT PAGE
  $('.custom-file-input').on('change', function () {
    var fileName = $(this).val().split('\\').pop();
    $(this).siblings('.custom-file-label').addClass('selected').html(fileName);
  });

  function readURL(input) {
    if (input.files && input.files[0]) {
      var reader = new FileReader();

      reader.onload = function (e) {
        $('#img-upload').attr('src', e.target.result);
      };

      reader.readAsDataURL(input.files[0]);
    }
  }

  $('#image').change(function () {
    readURL(this);
  });

  $('.add-to-cart').click(function () {
    const prodId = $(this).siblings('[name=productId]')[0].value;
    const csrf = $(this).siblings('[name=_csrf]')[0].value;
    fetch('/cart/' + prodId, {
      method: 'POST',
      headers: {
        'csrf-token': csrf,
      },
    }).then((data) => {
      window.location.assign(data.url);
    });
  });
});
