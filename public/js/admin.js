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
});
