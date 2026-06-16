import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export const mpPreference = new Preference(client);
export const mpPayment = new Payment(client);

export interface CreatePreferenceInput {
  listingId: string;
  listingTitle: string;
  price: number;
  currency: string;
  buyerEmail: string;
  quantity?: number;
}

export async function createPreference(input: CreatePreferenceInput) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const preference = await mpPreference.create({
    body: {
      items: [
        {
          id: input.listingId,
          title: input.listingTitle,
          unit_price: input.price,
          currency_id: input.currency === 'ARS' ? 'ARS' : 'ARS',
          quantity: input.quantity || 1,
        },
      ],
      payer: {
        email: input.buyerEmail,
      },
      back_urls: {
        success: `${appUrl}/payment/success`,
        failure: `${appUrl}/payment/failure`,
        pending: `${appUrl}/payment/pending`,
      },
      auto_return: 'approved',
      notification_url: `${appUrl}/api/payments/webhook`,
      metadata: {
        listing_id: input.listingId,
      },
    },
  });

  return preference;
}
