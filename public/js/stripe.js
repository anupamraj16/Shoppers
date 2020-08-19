import axios from 'axios';
import '@babel/polyfill';

var stripe = Stripe(
  'pk_test_51HBkokBiPV2ZWFlqOVQ8Llkx050VloklkRkieBSWqhL8d7tUzO6eTQsEUaLNcGhETghbg2WbxleHBQRd9MNIsV6K00HLaQrc0C'
);

$(document).ready(function () {
  // CUSTOM FILE NAME FOR ADD PRODUCT PAGE
  $('.custom-file-input').on('change', function () {
    var fileName = $(this).val().split('\\').pop();
    $(this).siblings('.custom-file-label').addClass('selected').html(fileName);
  });

  $('#order-btn').click(async function (e) {
    try {
      // 1) Get checkout session from API
      let session = await axios({ method: 'post', url: '/checkout-session' });
      await stripe.redirectToCheckout({
        sessionId: session.data.session.id,
      });
    } catch (error) {
      console.log(error);
    }
  });
});
