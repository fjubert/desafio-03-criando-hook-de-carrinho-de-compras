import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
	children: ReactNode;
}

interface UpdateProductAmount {
	productId: number;
	amount: number;
}

interface CartContextData {
	cart: Product[];
	addProduct: (productId: number) => Promise<void>;
	removeProduct: (productId: number) => void;
	updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
	const [cart, setCart] = useState<Product[]>(() => {
		const storagedCart = localStorage.getItem('@RocketShoes:cart');

		if (storagedCart) {
			return JSON.parse(storagedCart);
		}

		return [];
	});

	const setNewCart = (newCart: Product[]) => {
		localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
		setCart(newCart);
	}

	const getStock = async (productId: number) => {
		const stock = await api.get<Stock[]>('stock', {
			params: {
				id: productId
			}
		}).then( response => {
			return response.data[0].amount;
		});

		return stock;
	}

	const addProduct = async (productId: number) => {

		try {

			const stock = await getStock(productId);

			const checkCart = cart.some( product => product.id === productId );

			if( checkCart ) {
				const newCart = cart.map( product => {
					if(product.id === productId) {
						if( (product.amount + 1 ) <= stock ) {
							 product.amount += 1 ;
						} else {
							toast.error('Quantidade solicitada fora de estoque');
						}
					}
					return product;
				});

				if( newCart !== cart ) setNewCart(newCart);
				
			} else {
				const productToAdd = await api.get<Product[]>('products', {
					params: {
						id: productId
					}
				}).then( response => {
					return response.data[0];
				});

				if( stock >= 1) {
					productToAdd.amount = 1;
					const newCart = cart.concat(productToAdd);
					setNewCart(newCart);
				} else {
					toast.error('Quantidade solicitada fora de estoque');
				}
			}

		} catch {
			toast.error('Erro na adição do produto');
		}
	};

	const removeProduct = (productId: number) => {
		try {
			const newCart = cart.filter( product => {
				return product.id !== productId;
			})

			if( newCart !== cart ) setNewCart(newCart);

		} catch {
			toast.error('Erro na remoção do produto');
		}
	};

	const updateProductAmount = async ({
		productId,
		amount,
	}: UpdateProductAmount) => {
		try {
			const stock = await getStock(productId);

			const newCart = cart.map( product => {
				if(product.id === productId) {
					if(amount <= stock ) {
						product.amount = amount
					} else {
						toast.error('Quantidade solicitada fora de estoque');
					}
				}
				return product
			})
			if( newCart !== cart ) {
				localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
				setCart(newCart);
			}
				
		} catch {
			toast.error('Erro na alteração de quantidade do produto');
		}
	};

	return (
		<CartContext.Provider
			value={{ cart, addProduct, removeProduct, updateProductAmount }}
		>
			{children}
		</CartContext.Provider>
	);
}

export function useCart(): CartContextData {
	const context = useContext(CartContext);

	return context;
}
