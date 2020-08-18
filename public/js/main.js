$(document).ready(function () {
  const backdrop = document.querySelector('.backdrop');
  const sideDrawer = document.querySelector('.mobile-nav');
  const menuToggle = document.querySelector('#side-menu-toggle');

  function backdropClickHandler() {
    backdrop.style.display = 'none';
    sideDrawer.classList.remove('open');
  }

  function menuToggleClickHandler() {
    backdrop.style.display = 'block';
    sideDrawer.classList.add('open');
  }

  backdrop.addEventListener('click', backdropClickHandler);
  menuToggle.addEventListener('click', menuToggleClickHandler);

  // CUSTOM FILE NAME FOR ADD PRODUCT PAGE
  $('.custom-file-input').on('change', function () {
    var fileName = $(this).val().split('\\').pop();
    $(this).siblings('.custom-file-label').addClass('selected').html(fileName);
  });
});

// import axios from 'axios';
// import { showAlert } from './alerts';
// const stripe = Stripe(
//   'pk_test_51HBkokBiPV2ZWFlqOVQ8Llkx050VloklkRkieBSWqhL8d7tUzO6eTQsEUaLNcGhETghbg2WbxleHBQRd9MNIsV6K00HLaQrc0C'
// );

// export const bookTour = async (tourId) => {
//   try {
//     // 1) Get checkout session from API
//     const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
//     // console.log(session);

//     // 2) Create checkout form + chanre credit card
//     await stripe.redirectToCheckout({
//       sessionId: session.data.session.id,
//     });
//   } catch (err) {
//     console.log(err);
//     showAlert('error', err);
//   }
// };
