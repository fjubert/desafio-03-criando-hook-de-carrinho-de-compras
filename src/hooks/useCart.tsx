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
		setCart(newCart);
		localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
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

			const productsResponse = await api.get(`products/${productId}`)
			const newProduct = productsResponse.data
			const [existentProduct] = cart.filter( product => product.id === productId )

			if( existentProduct ) {
				updateProductAmount({ amount: existentProduct.amount + 1, productId: existentProduct.id })
				return
			} else {
				setCart([...cart, { ...newProduct, amount: 1 }])
				localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, { ...newProduct, amount: 1 }]))
			}

		} catch {
			toast.error('Erro na adição do produto');
		}
	};

	const removeProduct = (productId: number) => {
		try {
			const newCart = cart.filter((product: Product) => product.id !== productId)
			const [removedItem] = cart.filter((product: Product) => product.id === productId)
	  
			if (removedItem !== undefined) {
			  setCart(newCart)
			  localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
			} else {
				throw Error()
			}

		} catch {
			toast.error('Erro na remoção do produto');
		}
	};

	const updateProductAmount = async ({
		productId,
		amount,
	}: UpdateProductAmount) => {
		try {
			const stockResponse = await api.get(`stock/${productId}`)
			const stock = stockResponse.data
			const [updatedProduct] = cart.filter(product => product.id === productId)
			const newCart = [...cart]

			if (updatedProduct.amount < 1 || amount < 1) {
				return
			}
			if ( amount <= stock.amount ) {
				const updatedCart = newCart.map((product: Product) => {
					if (product.id === productId) {
					  product.amount = amount
					} 
					return product
				})
				setCart(updatedCart)
				localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
			} else {
				toast.error("Quantidade solicitada fora de estoque")
				return
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
